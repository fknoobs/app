import type { Match } from '$core/game/lobby';
import type { AntiCheatProcessDenylistResponse } from '$core/pocketbase/types';
import { invoke } from '@tauri-apps/api/core';
import { dev } from '$app/environment';
import { app } from '$core/app/context';
import { account } from '$core/account';
import { pocketbase } from '$core/pocketbase';
import { fetch } from '$core/http/fetch';
import { Feature } from '../feature.svelte';

export type AntiCheatSettings = {
	enabled: boolean;
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
const FIRST_CAPTURE_MIN_MS = dev ? 5_000 : LOADING_GRACE_MS;
const FIRST_CAPTURE_MAX_MS = dev ? 8_000 : LOADING_GRACE_MS + 15_000;
const FIRST_PROCESS_SCAN_MS = 8_000;
const PROCESS_SCAN_MIN_MS = 20_000;
const PROCESS_SCAN_MAX_MS = 30_000;
const CAPTURE_RETRY_MIN_MS = 5_000;
const CAPTURE_RETRY_MAX_MS = 15_000;
const MAX_CAPTURE_RETRIES = 20;

function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
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
 * Takes random screenshots of the CoH window during a live match and reports
 * known cheat processes from a server denylist.
 */
export class AntiCheat extends Feature<AntiCheatSettings> {
	name = 'anti-cheat';

	#unsubscribers: (() => void)[] = [];
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
			app.on('lobby.destroyed', () => {
				this.#stopSession();
			})
		);

		if (app.lobby?.started) {
			void this.#startSession(app.lobby);
		}
	}

	disable() {
		this.#stopSession();
		for (const unsubscribe of this.#unsubscribers) {
			unsubscribe();
		}
		this.#unsubscribers = [];
	}

	defaultSettings(): AntiCheatSettings {
		return { enabled: true };
	}

	async #startSession(match: Match): Promise<void> {
		this.#stopSession();

		if (!account.isAuthenticated) {
			console.warn('[ANTI-CHEAT]: skip session, not authenticated');
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
			map: this.#session.map
		});
		this.#scheduleCaptures();
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

	#scheduleCaptures(): void {
		const count = randomInt(MIN_CAPTURES, MAX_CAPTURES);
		const offsets = new Set<number>([randomInt(FIRST_CAPTURE_MIN_MS, FIRST_CAPTURE_MAX_MS)]);
		while (offsets.size < count) {
			offsets.add(randomInt(LOADING_GRACE_MS + 30_000, SCHEDULE_WINDOW_MS));
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

	async #captureWithRetry(attempts: number): Promise<void> {
		if (!this.#session) {
			return;
		}

		try {
			const capture = await invoke<GameWindowCapture>('capture_game_window');
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
		if (!this.#session || attempts >= MAX_CAPTURE_RETRIES) {
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
		if (!this.#session) {
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
