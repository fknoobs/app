'use strict';

const LOBBY_BACKFILL_BATCH_SIZE = 250;
const JOB_ID = 'lobby_players_backfill';
const lobbyPlayers = require(`${__hooks}/lib/lobby-players.js`);
const jobState = require(`${__hooks}/lib/job-state.js`);

function parsePlayers(raw) {
	return lobbyPlayers.parsePlayers(raw);
}

function summarizeLobbyPlayers(players) {
	const summaries = [];
	const ids = [];

	for (const player of players) {
		const profileId = player?.profile?.profile_id;
		if (profileId == null) {
			continue;
		}

		ids.push(profileId);
		summaries.push({
			profile_id: profileId,
			alias: player?.profile?.alias ?? '',
			playerId: player?.playerId ?? null,
			steamId: player?.steamId ?? null,
			race: player?.race ?? null
		});
	}

	return {
		summaries,
		csv: ids.length > 0 ? `,${ids.join(',')},` : '',
		ids
	};
}

function parseLobbyPlayersField(raw) {
	const players = parsePlayers(raw);
	if (players.length === 0) {
		return [];
	}

	if (players[0]?.profile_id != null) {
		return players;
	}

	return summarizeLobbyPlayers(players).summaries;
}

function isComplete() {
	return jobState.isComplete(JOB_ID);
}

function backfillLobbyFromRow(row) {
	const players = parsePlayers(row.players);
	const existingSummaries = parseLobbyPlayersField(row.lobbyPlayers);
	const { summaries, csv, ids } =
		existingSummaries.length > 0
			? {
					summaries: existingSummaries,
					csv:
						typeof row.playerProfileIdsCsv === 'string' && row.playerProfileIdsCsv.length > 0
							? row.playerProfileIdsCsv
							: existingSummaries.length > 0
								? `,${existingSummaries.map((player) => player.profile_id).join(',')},`
								: '',
					ids: existingSummaries.map((player) => player.profile_id)
				}
			: summarizeLobbyPlayers(players);

	const needsLobbyUpdate =
		existingSummaries.length === 0 &&
		(typeof row.lobbyPlayers !== 'string' ||
			row.lobbyPlayers.length <= 2 ||
			!row.playerProfileIdsCsv);

	if (needsLobbyUpdate && summaries.length > 0) {
		const record = $app.findRecordById('lobbies', row.id);
		record.set('lobbyPlayers', summaries);
		record.set('playerProfileIdsCsv', csv);
		record.set('hasReplay', Boolean(row.replay));
		$app.save(record);
	}

	lobbyPlayers.syncLobbyPlayerIndex(
		row.id,
		ids.length > 0 ? ids : summaries.map((player) => player.profile_id),
		row.result,
		lobbyPlayers.lobbyMeta(row.sessionId, row.map, row.user, row.needsResult, row.title),
		row.players
	);

	return {
		updated: needsLobbyUpdate && summaries.length > 0,
		indexed: ids.length > 0 || summaries.length > 0
	};
}

function runBatch() {
	const state = jobState.readState(JOB_ID);
	const page = state.page;
	const offset = (page - 1) * LOBBY_BACKFILL_BATCH_SIZE;

	if (state.complete) {
		return { processed: 0, updated: 0, indexed: 0, complete: true };
	}

	const rows = arrayOf(
		new DynamicModel({
			id: '',
			players: '',
			lobbyPlayers: '',
			playerProfileIdsCsv: '',
			replay: '',
			result: '',
			sessionId: 0,
			map: '',
			user: '',
			needsResult: false,
			title: ''
		})
	);

	$app
		.db()
		.newQuery(
			`SELECT
				id,
				COALESCE(players, '') AS players,
				COALESCE(lobbyPlayers, '') AS lobbyPlayers,
				COALESCE(playerProfileIdsCsv, '') AS playerProfileIdsCsv,
				COALESCE(replay, '') AS replay,
				COALESCE(result, '') AS result,
				COALESCE(sessionId, 0) AS sessionId,
				COALESCE(map, '') AS map,
				COALESCE(user, '') AS user,
				COALESCE(needsResult, 0) AS needsResult,
				COALESCE(title, '') AS title
			FROM lobbies
			ORDER BY createdAt ASC
			LIMIT {:limit} OFFSET {:offset}`
		)
		.bind({ limit: LOBBY_BACKFILL_BATCH_SIZE, offset })
		.all(rows);

	if (rows.length === 0) {
		jobState.setComplete(JOB_ID, page);
		return { processed: 0, updated: 0, indexed: 0, complete: true };
	}

	let updated = 0;
	let indexed = 0;

	for (const row of rows) {
		const result = backfillLobbyFromRow(row);
		if (result.updated) {
			updated += 1;
		}
		if (result.indexed) {
			indexed += 1;
		}
	}

	if (rows.length < LOBBY_BACKFILL_BATCH_SIZE) {
		jobState.setComplete(JOB_ID, page + 1);
		return { processed: rows.length, updated, indexed, complete: true };
	}

	jobState.setPage(JOB_ID, page + 1);
	return { processed: rows.length, updated, indexed, complete: false };
}

function repairEmptyLobbyPlayers(limit = 100) {
	const rows = arrayOf(
		new DynamicModel({
			id: '',
			players: '',
			lobbyPlayers: '',
			playerProfileIdsCsv: '',
			replay: '',
			result: '',
			sessionId: 0,
			map: '',
			user: '',
			needsResult: false,
			title: ''
		})
	);

	$app
		.db()
		.newQuery(
			`SELECT
				id,
				COALESCE(players, '') AS players,
				COALESCE(lobbyPlayers, '') AS lobbyPlayers,
				COALESCE(playerProfileIdsCsv, '') AS playerProfileIdsCsv,
				COALESCE(replay, '') AS replay,
				COALESCE(result, '') AS result,
				COALESCE(sessionId, 0) AS sessionId,
				COALESCE(map, '') AS map,
				COALESCE(user, '') AS user,
				COALESCE(needsResult, 0) AS needsResult,
				COALESCE(title, '') AS title
			FROM lobbies
			WHERE lobbyPlayers IS NULL
				OR lobbyPlayers = ''
				OR lobbyPlayers = '[]'
				OR playerProfileIdsCsv IS NULL
				OR playerProfileIdsCsv = ''
			ORDER BY createdAt DESC
			LIMIT {:limit}`
		)
		.bind({ limit })
		.all(rows);

	let updated = 0;
	for (const row of rows) {
		const result = backfillLobbyFromRow(row);
		if (result.updated) {
			updated += 1;
		}
	}

	return { scanned: rows.length, updated };
}

function repairMissingPlayerIndex(limit = 100) {
	const rows = arrayOf(
		new DynamicModel({
			id: '',
			players: '',
			lobbyPlayers: '',
			playerProfileIdsCsv: '',
			replay: '',
			result: '',
			sessionId: 0,
			map: '',
			user: '',
			needsResult: false,
			title: ''
		})
	);

	$app
		.db()
		.newQuery(
			`SELECT
				l.id,
				COALESCE(l.players, '') AS players,
				COALESCE(l.lobbyPlayers, '') AS lobbyPlayers,
				COALESCE(l.playerProfileIdsCsv, '') AS playerProfileIdsCsv,
				COALESCE(l.replay, '') AS replay,
				COALESCE(l.result, '') AS result,
				COALESCE(l.sessionId, 0) AS sessionId,
				COALESCE(l.map, '') AS map,
				COALESCE(l.user, '') AS user,
				COALESCE(l.needsResult, 0) AS needsResult,
				COALESCE(l.title, '') AS title
			FROM lobbies l
			WHERE l.needsResult = 0
				AND l.title != 'Skirmish'
				AND NOT EXISTS (SELECT 1 FROM lobby_player_index i WHERE i.lobby = l.id)
			ORDER BY l.createdAt DESC
			LIMIT {:limit}`
		)
		.bind({ limit })
		.all(rows);

	let indexed = 0;
	for (const row of rows) {
		const result = backfillLobbyFromRow(row);
		if (result.indexed) {
			indexed += 1;
		}
	}

	return { scanned: rows.length, indexed };
}

function reset() {
	jobState.reset(JOB_ID);
}

function getPage() {
	return jobState.getPage(JOB_ID);
}

module.exports = {
	isComplete,
	runBatch,
	repairEmptyLobbyPlayers,
	repairMissingPlayerIndex,
	reset,
	getPage
};
