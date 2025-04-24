declare module '@fknoobs/app' {
	import type { Twitch } from '$lib/modules/twitch/twitch.svelte';
	import type { Replays } from '$lib/modules/replay-manager/replays.svelte';

	interface Modules {
		twitch: typeof Twitch;
		replays: typeof Replays;
	}

	type RelicProfile = {
		profile_id: number;
		name: string;
		personal_statgroup_id: number;
		xp: number;
		level: number;
		leaderboardregion_id: number;
		country: string;
	};

	type Result = {
		code: number;
		message: string;
	};

	// Assuming members contain RelicProfile based on context, adjust if needed
	type StatGroup = {
		id: number;
		name: string;
		type: number;
		members: RelicProfile[]; // Or specify a more concrete type if known, e.g., RelicProfile[]
	};

	type LeaderboardStat = {
		statgroup_id: number;
		leaderboard_id: number;
		wins: number;
		losses: number;
		streak: number;
		disputes: number;
		drops: number;
		rank: number;
		ranktotal: number;
		ranklevel: number;
		regionrank: number;
		regionranktotal: number;
		lastmatchdate: number; // Unix timestamp
		highestrank: number;
		highestranklevel: number;
	};

	type PersonalStat = {
		result: Result;
		statGroups: StatGroup[];
		leaderboardStats: LeaderboardStat[];
	};

	type LobbyPlayer = {
		index: number;
		playerId: number;
		type: number;
		team: number;
		race: number;
		profile?: RelicProfile;
	};
}

declare module '@fknoobs/app/ws' {
	import type { RelicProfile, LobbyPlayer } from '@fknoobs/app';

	type GameEvents = {
		'GAME:LAUNCHED': Message<
			'GAME:LAUNCHED',
			{
				isRunning: boolean;
				steamId: string;
				profile: RelicProfile;
			}
		>;
		'LOBBY:STARTED': Message<
			'LOBBY:STARTED',
			{
				isStarted: boolean;
				map: string;
				outcome: 'PS_WON' | 'PS_LOST' | 'PS_ABORTED';
				players: LobbyPlayer[];
			}
		>;
		'LOBBY:ENDED': Message<
			'LOBBY:ENDED',
			{
				isStarted: boolean;
				map: string;
				outcome: 'PS_WON' | 'PS_LOST' | 'PS_ABORTED';
				players: LobbyPlayer[];
			}
		>;
	};

	type GameEvent = {
		[K in keyof GameEvents]: {
			type: K;
			data: GameEvents[K]['data'];
		};
	}[keyof GameEvents];

	// Combine GameEvents with potential future event types if needed
	type Events = GameEvents; // Add other event maps here using | if necessary

	type Event<T extends keyof Events = unkown> = {
		type: Events[T]['type'];
		data: Events[T]['data'];
	};

	type Message<T extends keyof Events, D extends Record<string, any>> = {
		type: T;
		data: D;
	};
}
