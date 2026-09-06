/// <reference lib="webworker" />

type ParseRequest = {
	id: number;
	type?: 'parse' | 'actions';
	content?: ArrayBuffer;
};

type CachedReplay = {
	duration: number;
	gameDate?: string;
	highResources?: boolean;
	randomStart?: boolean;
	mapFileName?: string;
	mapName?: string;
	matchType?: string;
	vpGame?: boolean;
	vpCount?: number;
	players: Array<{ id?: number | null; name?: string; faction?: string; doctrineName?: string; steamId?: string | null }>;
	messages: unknown[];
	actions: Array<{
		tick: number;
		timestamp: string;
		playerID?: number;
		commandID?: number;
		objectID?: number;
		command?: { type?: string; name?: string; description?: string } | null;
	}>;
	replayName?: string;
	playerCount?: number;
};

const cache = new Map<number, CachedReplay>();

function toSlimReplay(replay: CachedReplay, cpmByPlayerId: Record<string, string>) {
	return {
		duration: replay.duration,
		gameDate: replay.gameDate,
		highResources: replay.highResources,
		randomStart: replay.randomStart,
		mapFileName: replay.mapFileName,
		mapName: replay.mapName,
		matchType: replay.matchType,
		vpGame: replay.vpGame,
		vpCount: replay.vpCount,
		players: replay.players,
		messages: replay.messages,
		replayName: replay.replayName,
		playerCount: replay.playerCount,
		actions: [] as CachedReplay['actions'],
		cpmByPlayerId
	};
}

onmessage = async ({ data }: MessageEvent<ParseRequest>) => {
	try {
		if (data.type === 'actions') {
			const cached = cache.get(data.id);
			if (!cached) {
				postMessage({
					id: data.id,
					success: false,
					error: 'Replay parse cache expired. Re-parse the file.'
				});
				return;
			}

			const actions = (cached.actions ?? []).map((action) => ({
				tick: action.tick,
				timestamp: action.timestamp,
				playerID: action.playerID,
				commandID: action.commandID,
				objectID: action.objectID,
				command: action.command
					? {
							type: action.command.type,
							name: action.command.name,
							description: action.command.description
						}
					: null
			}));
			postMessage({ id: data.id, success: true, actions });
			return;
		}

		if (!data.content) {
			postMessage({ id: data.id, success: false, error: 'Missing replay bytes.' });
			return;
		}

		const { parseReplay, playerCpmLabel } = await import('@fknoobs/replay-parser');
		const replay = parseReplay(new Uint8Array(data.content)) as CachedReplay;
		const cpmByPlayerId: Record<string, string> = {};
		for (const player of replay.players ?? []) {
			if (player.id == null) {
				continue;
			}

			cpmByPlayerId[String(player.id)] = playerCpmLabel(replay as never, player.id);
		}

		cache.set(data.id, replay);
		postMessage({ id: data.id, success: true, replay: toSlimReplay(replay, cpmByPlayerId) });
	} catch (error) {
		postMessage({
			id: data.id,
			success: false,
			error: error instanceof Error ? error.message : String(error)
		});
	}
};

export {};
