import type { MatchExpanded } from '$core/app/database/matches';
import type { Match } from '$core/game/lobby';
import { app } from '$core/app/context';
import { account } from '$core/account';
import { Feature } from '../feature.svelte';
import { relic, relicLeaderboardFingerprint } from '$lib/relic';
import { join } from '@tauri-apps/api/path';
import { exists, readFile } from '@tauri-apps/plugin-fs';
import { parseReplay } from '@fknoobs/replay-parser';
import { download } from '@tauri-apps/plugin-upload';
import { Matches } from './matches.svelte';
import { extractPlayerRatingSnapshotsFromLobby, type PlayerEloMap } from '$lib/utils/player-elo';
import { ingestPlayerRatings } from '$core/pocketbase/player-ratings';
import { toPersistablePlayers } from '$core/game/lobby-utils';
import { embedSteamIdsInReplay } from '$lib/utils/replay-steam-ids';
import { getFile } from '$core/pocketbase';
import { t } from '$lib/i18n';

const POLL_INITIAL_MS = 10_000;
const POLL_MAX_MS = 60_000;
const PROFILE_REFRESH_DELAYS_MS = [15_000, 30_000, 45_000, 60_000, 90_000, 120_000];

/**
 * Saves finished matches (with replay) and fills in their results from the
 * Relic API.
 *
 * Result polling is on-demand: it only runs while matches with
 * `needsResult=true` exist and backs off when results take a while, instead
 * of polling unconditionally forever.
 */
export class History extends Feature {
	name = 'history';

	matches!: Matches;

	#pollTimer: ReturnType<typeof setTimeout> | null = null;
	#pollDelay = POLL_INITIAL_MS;
	#profileRefreshTimer: ReturnType<typeof setTimeout> | null = null;
	#profileRefreshDelays: number[] = [];
	#unsubscribers: (() => void)[] = [];
	#disposeMatches: (() => void) | null = null;

	override async register(): Promise<this> {
		this.#ensureMatches();
		return super.register();
	}

	override async destroy(): Promise<void> {
		this.#disposeMatches?.();
		this.#disposeMatches = null;
		await super.destroy();
	}

	#ensureMatches(): void {
		if (this.#disposeMatches) {
			return;
		}

		// Matches sets up reactive watchers/resources in its constructor, so it
		// must be created inside an effect root (register() runs outside one).
		this.#disposeMatches = $effect.root(() => {
			this.matches = new Matches();
		});
	}

	enable() {
		this.#ensureMatches();

		this.#unsubscribers.push(
			app.on('lobby.destroyed', ({ match, replay }) => {
				void this.saveLobbyResult(match, replay?.file ?? null);
				this.#scheduleProfileRefresh(PROFILE_REFRESH_DELAYS_MS);
			}),
			app.on('lobby.started', (match) => {
				void this.#harvestPlayerRatings(match);
			}),
			app.on('game.login', () => {
				// Catch up on pending results as soon as we know the player.
				this.#schedulePoll(0);
			})
		);

		this.#schedulePoll(0);
	}

	disable() {
		this.#stopPolling();
		this.#stopProfileRefresh();

		for (const unsubscribe of this.#unsubscribers) {
			unsubscribe();
		}

		this.#unsubscribers = [];
	}

	async #harvestPlayerRatings(match: Match): Promise<void> {
		if (!app.isReady || !account.userId) {
			return;
		}

		const snapshots = extractPlayerRatingSnapshotsFromLobby(match.players);
		if (snapshots.length === 0) {
			return;
		}

		try {
			const records = await ingestPlayerRatings(snapshots);
			if (records.length === 0) {
				return;
			}

			const bySteamId = new Map(records.map((record) => [record.steamId, record.elo]));
			this.#attachStoredElo(match, bySteamId);

			if (app.lobby && app.lobby.sessionId === match.sessionId) {
				this.#attachStoredElo(app.lobby, bySteamId);
				app.lobby = { ...app.lobby, players: [...app.lobby.players] };
			}
		} catch (error) {
			console.warn('[HISTORY]: player ratings harvest failed:', error);
		}
	}

	#attachStoredElo(match: Match, bySteamId: Map<string, PlayerEloMap>): void {
		for (const player of match.players) {
			if (!player.steamId) {
				continue;
			}

			const storedElo = bySteamId.get(player.steamId);
			if (storedElo) {
				player.storedElo = storedElo;
			}
		}
	}

	/** Persists a finished lobby as a match (with replay when available). */
	async saveLobbyResult(lobby: Match, replayFile: File | null = null): Promise<void> {
		if (!lobby.sessionId || !app.isReady) {
			return;
		}

		try {
			if (await app.database.matches.exists(lobby.sessionId)) {
				return;
			}

			const match = await app.database.matches.create({
				isRanked: lobby.isRanked,
				title: lobby.type,
				map: lobby.map || 'Unknown',
				sessionId: lobby.sessionId,
				needsResult: !lobby.isSkirmish,
				players: toPersistablePlayers(lobby.players),
				replay: replayFile ?? undefined
			});

			app.emit('lobby.saved', match);
			this.#schedulePoll(POLL_INITIAL_MS);
		} catch (error) {
			console.error('[HISTORY]: failed to save match:', error);
		}
	}

	#schedulePoll(delay: number): void {
		if (this.#pollTimer) {
			clearTimeout(this.#pollTimer);
		}

		this.#pollDelay = delay > 0 ? delay : POLL_INITIAL_MS;

		this.#pollTimer = setTimeout(() => void this.#poll(), delay);
	}

	#stopPolling(): void {
		if (this.#pollTimer) {
			clearTimeout(this.#pollTimer);
			this.#pollTimer = null;
		}

		this.#pollDelay = POLL_INITIAL_MS;
	}

	#stopProfileRefresh(): void {
		if (this.#profileRefreshTimer) {
			clearTimeout(this.#profileRefreshTimer);
			this.#profileRefreshTimer = null;
		}

		this.#profileRefreshDelays = [];
	}

	#scheduleProfileRefresh(delays: number[]): void {
		this.#stopProfileRefresh();
		this.#profileRefreshDelays = [...delays];
		this.#queueNextProfileRefresh();
	}

	#queueNextProfileRefresh(): void {
		const delay = this.#profileRefreshDelays.shift();
		if (delay == null) return;
		this.#profileRefreshTimer = setTimeout(() => void this.#runProfileRefresh(), delay);
	}

	async #runProfileRefresh(): Promise<void> {
		this.#profileRefreshTimer = null;
		await this.#refreshRelicProfile();
		this.#queueNextProfileRefresh();
	}

	async #refreshRelicProfile(): Promise<void> {
		const existing = app.game.profile;
		const steamId = existing?.steam.steamid ?? app.game.steamId;
		if (!existing || !steamId) return;

		try {
			const relicProfile = await relic.getProfileBySteamId(steamId);
			if (!relicProfile) return;

			const previous = relicLeaderboardFingerprint(existing.relic.leaderboardStats);
			const next = relicLeaderboardFingerprint(relicProfile.leaderboardStats);
			if (previous === next) return;

			app.game.profile = { relic: relicProfile, steam: existing.steam };
		} catch (error) {
			console.warn('[HISTORY]: relic profile refresh failed:', error);
		}
	}

	async #poll(): Promise<void> {
		this.#pollTimer = null;

		try {
			const pending = await this.#fillPendingResults();

			if (pending === 0) {
				// Nothing to do: stay idle until the next match is saved.
				this.#stopPolling();
				return;
			}

			// Results pending: retry with backoff.
			this.#schedulePoll(Math.min(this.#pollDelay * 2, POLL_MAX_MS));
		} catch (error) {
			console.warn('[HISTORY]: result poll failed:', error);
			this.#schedulePoll(Math.min(this.#pollDelay * 2, POLL_MAX_MS));
		}
	}

	/**
	 * Fetches results for matches that still need one.
	 * Returns the number of matches still pending afterwards.
	 */
	async #fillPendingResults(): Promise<number> {
		const profileId = app.game.profile?.relic.profile_id;

		if (!profileId) {
			return 0;
		}

		const needingResults = await app.database.matches.getPaginated(1, 100, {
			filter: `needsResult=true && hasFailed!=true && user = "${account.userId}"`,
			expand: false
		});

		if (needingResults.items.length === 0) {
			return 0;
		}

		const recentMatches = await relic.getRecentMatchHistoryForProfile(profileId, {
			includeHidden: true
		});
		let pending = needingResults.items.length;

		for (const item of needingResults.items) {
			const result = recentMatches.find((m) => m.id === item.sessionId);

			if (!result) {
				continue;
			}

			try {
				const update: {
					needsResult: false;
					result: typeof result;
					replay?: File;
				} = {
					needsResult: false,
					result
				};

				if (item.replay) {
					try {
						const bytes = await getFile(item, item.replay);
						const withSteamIds = embedSteamIdsInReplay(bytes, result.players);
						update.replay = new File([withSteamIds], item.replay);
					} catch (error) {
						console.warn(
							'[HISTORY]: failed to embed Steam IDs into replay for match',
							item.id,
							error
						);
					}
				}

				const updated = await app.database.matches.update(item.id, update);
				app.emit('match.result', updated);
				void this.#refreshRelicProfile();

				pending--;
			} catch (error) {
				console.warn('[HISTORY]: failed to store result for match', item.id, error);
			}
		}

		return pending;
	}

	/** Reads the replay of the last finished match from the playback folder. */
	async getLastMatchReplay() {
		const path = await join(await app.paths.cohPlaybackDir(), 'temp.rec');

		if (!(await exists(path))) {
			return null;
		}

		const fileData = await readFile(path);
		const replay = parseReplay(new Uint8Array(fileData));

		return {
			file: new File([fileData], 'replay.rec'),
			replay
		};
	}

	async downloadReplay(match: MatchExpanded): Promise<{ ok: boolean; downloadCount?: number }> {
		try {
			const path = await join(await app.paths.cohPlaybackDir(), match.replay);
			const url = app.pocketbase.files.getURL(match, match.replay);

			await download(url, path);
			let downloadCount: number | undefined;
			try {
				downloadCount = await app.database.matchSocial.recordDownload(match.id);
			} catch (error) {
				console.warn('[HISTORY]: failed to record replay download:', error);
			}
			app.toast.success(t('Replay saved to the Company of Heroes playback folder.'));
			return { ok: true, downloadCount };
		} catch (error) {
			app.toast.error(
				t('Failed to download replay: {message}', {
					message: error instanceof Error ? error.message : String(error)
				})
			);
			return { ok: false };
		}
	}

	async downloadExists(match: MatchExpanded): Promise<boolean> {
		const path = await join(await app.paths.cohPlaybackDir(), match.replay);

		return await exists(path);
	}

	defaultSettings(): { enabled: boolean } {
		return {
			enabled: true
		};
	}
}

export const history = new History();
