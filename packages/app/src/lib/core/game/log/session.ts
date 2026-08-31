import Emittery from 'emittery';
import type { TransformedMatch } from '@fknoobs/app';
import {
	currentLogTimestamp,
	isLiveGameForm,
	Lobby,
	mapFromScenarioPath,
	raceFromLogFaction,
	syntheticReplaySessionId,
	teamFromRace
} from '../lobby';
import type { TriggerEvent, TriggerEvents } from './parser';

/**
 * Lobby session state machine.
 *
 * Consumes parsed trigger events and produces high-level domain events.
 * External lookups (Relic/Steam profiles) are injected so the machine is
 * fully testable without network or Tauri.
 */

export type RelicProfileLike = {
	profile_id: number;
	name: string;
	alias: string;
	[key: string]: unknown;
};

export type SessionDeps = {
	getProfileBySteamId(steamId: string): Promise<RelicProfileLike | null | undefined>;
	getSteamProfile(steamId: string): Promise<unknown | null>;
	getProfileByIds(ids: number[]): Promise<RelicProfileLike[]>;
	getRecentMatchHistoryForProfile(profileId: number): Promise<TransformedMatch[]>;
};

export type SessionEvents = {
	authenticated: { steamId: string; relicProfile: unknown; steamProfile: unknown };
	logout: undefined;
	'lobby.joined': Lobby;
	'lobby.started': Lobby;
	'lobby.missionStarting': Lobby | undefined;
	'lobby.gameover': Lobby;
	'lobby.destroyed': Lobby;
	'lobby.result': { playerId: number; result: 'PS_WON' | 'PS_KILLED' };
};

export class LogSession extends Emittery<SessionEvents> {
	lobby: Lobby | undefined;
	sessionId: number | null = null;
	localSteamId: string | undefined;

	#deps: SessionDeps;
	#pendingReplayPlayers = new Map<number, { index: number; race: number; team: number }>();
	#pendingScenario: string | undefined;
	#didEnrichLiveHistory = false;

	constructor(deps: SessionDeps) {
		super();
		this.#deps = deps;
	}

	/** Resets all session state (log truncated / watcher restarted). */
	reset(): void {
		this.lobby = undefined;
		this.sessionId = null;
		this.#didEnrichLiveHistory = false;
		this.#clearReplayBuffer();
	}

	async handle(event: TriggerEvent): Promise<void> {
		switch (event.type) {
			case 'LOG:FOUND:PROFILE':
				return this.#onFoundProfile(event.data);
			case 'LOG:LOBBY:POPULATING':
				return this.#onPopulating(event.data);
			case 'LOG:LOBBY:POPULATING:PLAYER':
				return this.#onPlayer(event.data);
			case 'LOG:LOBBY:POPULATING:PLAYER:RACE':
				return this.#onPlayerRace(event.data);
			case 'LOG:LOBBY:POPULATING:SCENARIO':
				return this.#onScenario(event.data);
			case 'LOG:LOBBY:PLAYBACK':
				return this.#onPlayback();
			case 'LOG:LOBBY:POPULATING:PLAYER:STEAM':
				return this.#onPlayerSteam(event.data);
			case 'LOG:LOBBY:POPULATING:MAP':
				return this.#onMap(event.data);
			case 'LOG:LOBBY:SESSIONID':
				return this.#onSessionId(event.data);
			case 'LOG:LOBBY:STARTED':
				return this.#onStarted();
			case 'LOG:LOBBY:PLAYER:RESULT':
				return this.#onResult(event.data);
			case 'LOG:LOBBY:GAMEOVER':
				return this.#onGameOver();
			case 'LOG:LOBBY:DESTROYED':
				return this.#onDestroyed();
			case 'LOG:ENDED':
				return this.#onEnded();
			default:
				return;
		}
	}

	async #onFoundProfile({ steamId }: TriggerEvents['LOG:FOUND:PROFILE']): Promise<void> {
		try {
			const [relicProfile, steamProfile] = await Promise.all([
				this.#deps.getProfileBySteamId(steamId),
				this.#deps.getSteamProfile(steamId)
			]);

			if (relicProfile && steamProfile) {
				this.localSteamId = steamId;

				if (this.lobby) {
					this.lobby.localSteamId = steamId;
				}

				await this.emitSerial('authenticated', { steamId, relicProfile, steamProfile });
			}
		} catch (error) {
			console.error('[LOG]: Failed to resolve profile for', steamId, error);
		}
	}

	async #onPopulating({ startedAt, form }: TriggerEvents['LOG:LOBBY:POPULATING']): Promise<void> {
		const time = startedAt.trim();
		const isReplay = !isLiveGameForm(form);

		if (this.lobby && this.#isSameLobby(time)) {
			this.lobby.isReplay = isReplay;
			this.lobby.isRanked = form === 'AutoMatchForm';
			if (!this.lobby.startedAt) this.lobby.startedAt = time;
			this.#resetLiveRoster(isReplay);
			return;
		}

		if (this.lobby && !this.lobby.started && !this.lobby.startedAt) {
			this.lobby.startedAt = time;
			this.lobby.isRanked = form === 'AutoMatchForm';
			this.lobby.isReplay = isReplay;
			this.lobby.sessionId = this.sessionId;
			this.lobby.localSteamId = this.localSteamId;
			this.#resetLiveRoster(isReplay);

			if (!isReplay) {
				await this.emitSerial('lobby.joined', this.lobby);
			}

			return;
		}

		this.lobby = new Lobby(time, form === 'AutoMatchForm', isReplay);
		this.lobby.localSteamId = this.localSteamId;
		this.lobby.sessionId = this.sessionId;

		if (!isReplay) {
			await this.emitSerial('lobby.joined', this.lobby);
		}
	}

	#isSameLobby(startedAt: string): boolean {
		if (!this.lobby) {
			return false;
		}

		if (this.lobby.startedAt === startedAt) {
			return true;
		}

		return (
			this.sessionId != null &&
			this.lobby.sessionId != null &&
			this.lobby.sessionId === this.sessionId
		);
	}

	#ensureLobby(): Lobby {
		if (!this.lobby) {
			this.lobby = new Lobby('', false, false);
			this.lobby.localSteamId = this.localSteamId;
			this.lobby.sessionId = this.sessionId;
		}

		return this.lobby;
	}

	/**
	 * Replay support calls `#ensureLobby()` on pre-start `PopulateGameInfo` lines.
	 * Custom lobbies log closed slots there (often a 4p default map). Live
	 * `Starting game` used to keep that roster; drop it so the following
	 * player lines are the match that actually launched.
	 */
	#resetLiveRoster(isReplay: boolean): void {
		if (isReplay || !this.lobby || this.lobby.started) return;
		this.lobby.players = [];
		this.#didEnrichLiveHistory = false;
	}

	#clearReplayBuffer(): void {
		this.#pendingReplayPlayers.clear();
		this.#pendingScenario = undefined;
	}

	#applyPendingReplayPlayers(lobby: Lobby): void {
		for (const pending of this.#pendingReplayPlayers.values()) {
			lobby.addPlayer({
				index: pending.index,
				playerId: 0,
				type: 0,
				race: pending.race,
				team: pending.team,
				name: `Player ${pending.index + 1}`
			});
		}
	}

	#applyPendingMap(lobby: Lobby): void {
		if (lobby.map || !this.#pendingScenario) return;
		lobby.map = mapFromScenarioPath(this.#pendingScenario);
	}

	async #refreshStartedReplay(lobby: Lobby): Promise<void> {
		if (!lobby.started || !lobby.isReplay) {
			return;
		}

		await this.emitSerial('lobby.started', lobby);
	}

	async #onPlayer(data: TriggerEvents['LOG:LOBBY:POPULATING:PLAYER']): Promise<void> {
		const lobby = this.#ensureLobby();
		lobby.addPlayer({
			index: data.index,
			playerId: data.playerId,
			type: data.type,
			race: data.race,
			team: data.team,
			name: data.name?.trim() || undefined
		});
		await this.#refreshStartedReplay(lobby);
		await this.#enrichLiveIfNeeded(lobby);
	}

	#onPlayerRace({ index, faction }: TriggerEvents['LOG:LOBBY:POPULATING:PLAYER:RACE']): void {
		const label = faction.trim();
		if (/^\d+$/.test(label)) return;
		const race = raceFromLogFaction(label);
		if (race == null) return;
		this.#pendingReplayPlayers.set(index, { index, race, team: teamFromRace(race) });
		if (!this.lobby?.isReplay) return;
		this.#applyPendingReplayPlayers(this.lobby);
		void this.#refreshStartedReplay(this.lobby);
	}

	async #onScenario({ scenario }: TriggerEvents['LOG:LOBBY:POPULATING:SCENARIO']): Promise<void> {
		this.#pendingScenario = scenario;
		if (!this.lobby) return;
		this.#applyPendingMap(this.lobby);
		await this.#refreshStartedReplay(this.lobby);
	}

	#onPlayback(): void {
		const lobby = this.#ensureLobby();
		lobby.isReplay = true;
		if (!lobby.startedAt) {
			lobby.startedAt = currentLogTimestamp();
		}
		this.#applyPendingReplayPlayers(lobby);
		this.#applyPendingMap(lobby);
	}

	async #onPlayerSteam({
		ranking,
		slot,
		steamId
	}: TriggerEvents['LOG:LOBBY:POPULATING:PLAYER:STEAM']): Promise<void> {
		const player = this.lobby?.getPlayerBySlot(slot);

		if (!player) return;

		player.steamId = steamId.toString();
		player.ranking = ranking;
		player.slot = slot;

		if (this.lobby?.started && !this.lobby.isReplay) {
			await this.emitSerial('lobby.started', this.lobby);
		}
	}

	async #onMap({ map }: TriggerEvents['LOG:LOBBY:POPULATING:MAP']): Promise<void> {
		const lobby = this.#ensureLobby();
		lobby.map = map;
		await this.#refreshStartedReplay(lobby);
	}

	#onSessionId({ sessionId }: TriggerEvents['LOG:LOBBY:SESSIONID']): void {
		this.sessionId = sessionId;
	}

	async #onStarted(): Promise<void> {
		const lobby = this.#ensureLobby();

		if (lobby.isReplay && lobby.players.length === 0 && this.#pendingReplayPlayers.size > 0) {
			this.#applyPendingReplayPlayers(lobby);
		}
		this.#applyPendingMap(lobby);
		lobby.pruneEmptySlots();

		await this.emitSerial('lobby.missionStarting', lobby);

		if (lobby.started) return;

		if (!lobby.startedAt) {
			lobby.startedAt = currentLogTimestamp();
		}

		lobby.sessionId = this.sessionId ?? lobby.sessionId;
		if (!lobby.sessionId) {
			lobby.sessionId = syntheticReplaySessionId(lobby.startedAt);
		}

		const profileIds = lobby.getPlayerIds().filter((id) => id > 0);
		lobby.started = true;

		if (!lobby.isReplay && profileIds.length > 0) {
			await this.#enrichStartedLobby(lobby, profileIds);
			return;
		}

		await this.emitSerial('lobby.started', lobby);
	}

	async #enrichLiveIfNeeded(lobby: Lobby): Promise<void> {
		if (!lobby.started || lobby.isReplay || this.#didEnrichLiveHistory) return;
		const profileIds = lobby.getPlayerIds().filter((id) => id > 0);
		if (profileIds.length === 0) return;
		await this.#enrichStartedLobby(lobby, profileIds);
	}

	async #enrichStartedLobby(lobby: Lobby, profileIds: number[]): Promise<void> {
		this.#didEnrichLiveHistory = true;
		try {
			const profiles = await this.#deps.getProfileByIds(profileIds);

			lobby.players.forEach((player) => {
				player.profile = profiles.find(
					(profile) => profile.profile_id === player.playerId
				) as typeof player.profile;
			});
		} catch (error) {
			console.error('[LOG]: Failed to resolve lobby player profiles:', error);
		}

		await this.#attachMatchHistory(lobby);

		if (this.lobby !== lobby) {
			return;
		}

		await this.emitSerial('lobby.started', lobby);
	}

	async #attachMatchHistory(lobby: Lobby): Promise<void> {
		if (!lobby || lobby.isReplay) {
			return;
		}

		await Promise.all(
			lobby.players.map(async (player) => {
				const profileId = player.profile?.profile_id;

				if (!profileId) {
					player.matchHistory = [];
					return;
				}

				try {
					player.matchHistory = await this.#deps.getRecentMatchHistoryForProfile(profileId);
				} catch (error) {
					console.error('[LOG]: Failed to fetch match history for', profileId, error);
					player.matchHistory = [];
				}
			})
		);
	}

	async #onResult({ playerId, result }: TriggerEvents['LOG:LOBBY:PLAYER:RESULT']): Promise<void> {
		await this.emitSerial('lobby.result', { playerId, result });
	}

	async #onGameOver(): Promise<void> {
		if (!this.lobby) {
			return;
		}

		this.lobby.ended = true;
		await this.emitSerial('lobby.gameover', this.lobby);
	}

	async #onDestroyed(): Promise<void> {
		if (this.lobby) {
			await this.emitSerial('lobby.destroyed', this.lobby);
		}

		this.lobby = undefined;
		this.sessionId = null;
		this.#didEnrichLiveHistory = false;
		this.#clearReplayBuffer();
	}

	async #onEnded(): Promise<void> {
		await this.emitSerial('logout');
	}
}
