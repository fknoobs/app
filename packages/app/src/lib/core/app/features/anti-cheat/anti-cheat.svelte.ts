import type { Match } from '$core/game/lobby';
import type { AntiCheatProcessDenylistResponse } from '$core/pocketbase/types';
import { invoke } from '@tauri-apps/api/core';
import { watch } from 'runed';
import { dev } from '$app/environment';
import { app } from '$core/app/context';
import { account } from '$core/account';
import { pocketbase } from '$core/pocketbase';
import { fetch } from '$core/http/fetch';
import { Feature } from '../feature.svelte';

export type AntiCheatSettings = {
	enabled: boolean;
	announceInChat: boolean;
};

type GameWindowCapture = {
	jpegBase64: string;
	width: number;
	height: number;
};

type DenylistedProcess = {
	name: string;
	pid: number;
};

type ActiveSession = {
	sessionId: number;
	map: string;
};

const LOADING_GRACE_MS = 30_000;
const MIN_CAPTURES = 2;
const MAX_CAPTURES = 5;
const SCHEDULE_WINDOW_MS = 25 * 60 * 1000;
const MAX_SESSION_AGE_MS = 2 * 60 * 60 * 1000;
const FIRST_CAPTURE_MIN_MS = dev ? 5_000 : LOADING_GRACE_MS;
const FIRST_CAPTURE_MAX_MS = dev ? 8_000 : LOADING_GRACE_MS + 15_000;
const FIRST_PROCESS_SCAN_MS = 8_000;
const PROCESS_SCAN_MIN_MS = 20_000;
const PROCESS_SCAN_MAX_MS = 30_000;
const CAPTURE_RETRY_MIN_MS = 5_000;
const CAPTURE_RETRY_MAX_MS = 15_000;
const MAX_CAPTURE_RETRIES = 20;
const CHAT_ANNOUNCE_MESSAGE = '[FAIPLAY] Supervised by coh1stats.com';
const CHAT_ANNOUNCE_GRACE_MS = dev ? 5_000 : LOADING_GRACE_MS;
const CHAT_ANNOUNCE_RETRY_MS = 3_000;
const CHAT_ANNOUNCE_RETRY_WINDOW_MS = 60_000;

function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Elapsed time since `warnings.log` lobby start (`HH:MM:SS` wall clock). */
function matchElapsedMs(startedAt: string | undefined | null): number {
	if (!startedAt) return 0;
	const parsed = startedAt.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})/);
	if (!parsed) return 0;
	const now = new Date();
	const started = new Date(now);
	started.setHours(Number(parsed[1]), Number(parsed[2]), Number(parsed[3]), 0);
	let elapsed = now.getTime() - started.getTime();
	if (elapsed < -5 * 60 * 1000) {
		elapsed += 24 * 60 * 60 * 1000;
	}
	return Math.max(0, elapsed);
}

function base64ToJpegFile(base64: string): File {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new File([bytes], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
}

/**
 * Takes random screenshots of the CoH window during a live match, reports
 * known cheat processes from a server denylist, and posts a one-time all-chat
 * announce so other players can see that fair play is on.
 */
export class AntiCheat extends Feature<AntiCheatSettings> {
	name = 'anti-cheat';

	#unsubscribers: (() => void)[] = [];
	#disposeWatchers: (() => void) | null = null;
	#captureTimers: ReturnType<typeof setTimeout>[] = [];
	#processTimer: ReturnType<typeof setTimeout> | null = null;
	#session: ActiveSession | null = null;
	#sessionToken = 0;
	#denylist: AntiCheatProcessDenylistResponse[] = [];
	#reportedHits = new Set<string>();

	enable() {
		this.#unsubscribers.push(
			app.on('lobby.started', (match) => {
				void this.#startSession(match);
			}),
			app.on('lobby.gameover', () => {
				this.#stopSession();
			}),
			app.on('lobby.destroyed', () => {
				this.#stopSession();
			})
		);

		this.#disposeWatchers = $effect.root(() => {
			watch(
				() => app.game.isRunning,
				(running) => {
					if (!running) {
						this.#stopSession();
					}
				}
			);
		});

		if (app.lobby?.started && !app.lobby.ended) {
			void this.#startSession(app.lobby);
		}
	}

	disable() {
		this.#stopSession();
		this.#disposeWatchers?.();
		this.#disposeWatchers = null;
		for (const unsubscribe of this.#unsubscribers) {
			unsubscribe();
		}
		this.#unsubscribers = [];
	}

	defaultSettings(): AntiCheatSettings {
		return { enabled: true, announceInChat: true };
	}

	async #startSession(match: Match): Promise<void> {
		this.#stopSession();

		if (!account.isAuthenticated) {
			console.warn('[ANTI-CHEAT]: skip session, not authenticated');
			return;
		}

		if (match.ended || !app.game.isRunning) {
			return;
		}

		const elapsedMs = matchElapsedMs(match.startedAt);
		if (elapsedMs > MAX_SESSION_AGE_MS) {
			console.warn('[ANTI-CHEAT]: skip session, match start too old');
			return;
		}

		const token = this.#sessionToken;
		this.#session = {
			sessionId: match.sessionId || 0,
			map: match.map || match.mapName || 'Unknown'
		};
		this.#reportedHits.clear();
		await this.#refreshDenylist();
		if (token !== this.#sessionToken || !this.#session) {
			return;
		}

		console.info('[ANTI-CHEAT]: session started', {
			sessionId: this.#session.sessionId,
			map: this.#session.map,
			elapsedSec: Math.round(elapsedMs / 1000)
		});
		this.#scheduleCaptures(elapsedMs);
		this.#scheduleChatAnnounce(elapsedMs);
		this.#processTimer = setTimeout(() => {
			void this.#scanProcesses();
		}, FIRST_PROCESS_SCAN_MS);
	}

	#stopSession(): void {
		this.#sessionToken += 1;
		this.#session = null;
		for (const timer of this.#captureTimers) {
			clearTimeout(timer);
		}
		this.#captureTimers = [];
		if (this.#processTimer) {
			clearTimeout(this.#processTimer);
			this.#processTimer = null;
		}
	}

	#trackTimer(timer: ReturnType<typeof setTimeout>): void {
		this.#captureTimers.push(timer);
	}

	#isLiveMatch(): boolean {
		if (!this.#session || !app.game.isRunning) {
			return false;
		}

		const lobby = app.lobby;
		if (!lobby?.started || lobby.ended) {
			return false;
		}

		if (this.#session.sessionId && lobby.sessionId && lobby.sessionId !== this.#session.sessionId) {
			return false;
		}

		return true;
	}

	#scheduleCaptures(elapsedMs: number): void {
		const offsets = new Set<number>();
		const firstFromStart = randomInt(FIRST_CAPTURE_MIN_MS, FIRST_CAPTURE_MAX_MS);
		if (firstFromStart > elapsedMs) {
			offsets.add(firstFromStart - elapsedMs);
		}

		const count = randomInt(MIN_CAPTURES, MAX_CAPTURES);
		let attempts = 0;
		while (offsets.size < count && attempts < 40) {
			attempts += 1;
			const fromStart = randomInt(LOADING_GRACE_MS + 30_000, SCHEDULE_WINDOW_MS);
			if (fromStart > elapsedMs) {
				offsets.add(fromStart - elapsedMs);
			}
		}

		if (offsets.size === 0) {
			console.info('[ANTI-CHEAT]: skip captures, match sample window already elapsed', {
				elapsedSec: Math.round(elapsedMs / 1000)
			});
			return;
		}

		const scheduled = [...offsets].sort((a, b) => a - b);
		console.info(
			'[ANTI-CHEAT]: captures scheduled in',
			scheduled.map((ms) => `${Math.round(ms / 1000)}s`)
		);

		for (const offset of scheduled) {
			this.#trackTimer(setTimeout(() => void this.#captureWithRetry(0), offset));
		}
	}

	#shouldAnnounceChat(): boolean {
		return this.enabled && this.settings.announceInChat;
	}

	#scheduleChatAnnounce(elapsedMs: number): void {
		if (!this.#shouldAnnounceChat()) {
			console.info('[ANTI-CHEAT]: skip chat announce, disabled in settings');
			return;
		}

		const delay = Math.max(CHAT_ANNOUNCE_GRACE_MS - elapsedMs, 0);
		console.info('[ANTI-CHEAT]: chat announce scheduled in', `${Math.round(delay / 1000)}s`);
		this.#trackTimer(
			setTimeout(
				() => void this.#announceChatWithRetry(Date.now() + CHAT_ANNOUNCE_RETRY_WINDOW_MS),
				delay
			)
		);
	}

	async #announceChatWithRetry(deadlineMs: number): Promise<void> {
		if (!this.#isLiveMatch() || !this.#shouldAnnounceChat()) {
			return;
		}

		if (app.game.isIngameChatOpen) {
			this.#retryChatAnnounce('ingame chat is open', deadlineMs);
			return;
		}

		try {
			await invoke('send_game_chat', { message: CHAT_ANNOUNCE_MESSAGE });
			if (!this.#isLiveMatch()) {
				return;
			}
			console.info('[ANTI-CHEAT]: chat announce sent');
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (message.includes('not focused')) {
				this.#retryChatAnnounce('game is not focused', deadlineMs);
				return;
			}
			console.warn('[ANTI-CHEAT]: chat announce failed:', error);
		}
	}

	#retryChatAnnounce(reason: string, deadlineMs: number): void {
		if (!this.#isLiveMatch() || !this.#shouldAnnounceChat() || Date.now() >= deadlineMs) {
			console.info('[ANTI-CHEAT]: skip chat announce,', reason);
			return;
		}

		this.#trackTimer(
			setTimeout(() => void this.#announceChatWithRetry(deadlineMs), CHAT_ANNOUNCE_RETRY_MS)
		);
	}

	async #captureWithRetry(attempts: number): Promise<void> {
		if (!this.#isLiveMatch()) {
			this.#stopSession();
			return;
		}

		try {
			const capture = await invoke<GameWindowCapture>('capture_game_window');
			if (!this.#isLiveMatch()) {
				this.#stopSession();
				return;
			}

			await this.#uploadCapture(capture);
			console.info('[ANTI-CHEAT]: capture uploaded', {
				width: capture.width,
				height: capture.height
			});
		} catch (error) {
			console.warn('[ANTI-CHEAT]: capture failed:', error);
			this.#retryCapture(attempts);
		}
	}

	#retryCapture(attempts: number): void {
		if (!this.#isLiveMatch() || attempts >= MAX_CAPTURE_RETRIES) {
			return;
		}

		this.#trackTimer(
			setTimeout(
				() => void this.#captureWithRetry(attempts + 1),
				randomInt(CAPTURE_RETRY_MIN_MS, CAPTURE_RETRY_MAX_MS)
			)
		);
	}

	async #uploadCapture(capture: GameWindowCapture): Promise<void> {
		if (!this.#isLiveMatch()) {
			return;
		}

		const session = this.#session;
		const userId = pocketbase.authStore.record?.id ?? account.userId;
		if (!session || !userId) {
			return;
		}

		await pocketbase.collection('anti_cheat_captures').create(
			{
				user: userId,
				session_id: session.sessionId || undefined,
				map: session.map,
				game_focused: app.game.isWindowFocused,
				captured_at: new Date().toISOString(),
				steam_id:
					account.user.steamIds?.find(Boolean) ||
					app.game.steamId ||
					app.game.profile?.steam.steamid ||
					undefined,
				image: base64ToJpegFile(capture.jpegBase64)
			},
			{ fetch }
		);
	}

	#scheduleProcessScan(): void {
		if (!this.#session) {
			return;
		}

		this.#processTimer = setTimeout(
			() => {
				void this.#scanProcesses();
			},
			randomInt(PROCESS_SCAN_MIN_MS, PROCESS_SCAN_MAX_MS)
		);
	}

	async #scanProcesses(): Promise<void> {
		if (!this.#isLiveMatch()) {
			this.#stopSession();
			return;
		}

		try {
			const names = this.#denylist
				.filter((item) => item.enabled !== false)
				.map((item) => item.name);
			if (names.length > 0) {
				const hits = await invoke<DenylistedProcess[]>('find_denylisted_processes', { names });
				for (const hit of hits) {
					await this.#reportHit(hit);
				}
			}
		} catch (error) {
			console.warn('[ANTI-CHEAT]: process scan failed:', error);
		}

		this.#scheduleProcessScan();
	}

	async #reportHit(hit: DenylistedProcess): Promise<void> {
		const session = this.#session;
		const userId = pocketbase.authStore.record?.id ?? account.userId;
		if (!session || !userId) {
			return;
		}

		const key = `${session.sessionId}:${hit.name.toLowerCase()}`;
		if (this.#reportedHits.has(key)) {
			return;
		}

		this.#reportedHits.add(key);

		try {
			await pocketbase.collection('anti_cheat_process_hits').create(
				{
					user: userId,
					session_id: session.sessionId,
					process_name: hit.name,
					pid: hit.pid,
					detected_at: new Date().toISOString()
				},
				{ fetch }
			);
		} catch (error) {
			this.#reportedHits.delete(key);
			console.warn('[ANTI-CHEAT]: process hit upload failed:', error);
		}
	}

	async #refreshDenylist(): Promise<void> {
		try {
			this.#denylist = await pocketbase
				.collection('anti_cheat_process_denylist')
				.getFullList<AntiCheatProcessDenylistResponse>({ fetch });
		} catch (error) {
			console.warn('[ANTI-CHEAT]: denylist fetch failed:', error);
			this.#denylist = [];
		}
	}
}

export const antiCheat = new AntiCheat();
