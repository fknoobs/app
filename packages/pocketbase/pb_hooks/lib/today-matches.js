'use strict';

const { loadUserSteamIds } = require(`${__hooks}/lib/match-history.js`);

const LOBBY_SHAPE = {
	id: '',
	map: '',
	title: '',
	result: '',
	createdAt: '',
	isRanked: false,
	sessionId: 0,
	needsResult: false,
	lobbyPlayers: '',
	playerProfileIdsCsv: '',
	players: '',
	user: '',
	hasReplay: false,
	replay: '',
	updatedAt: ''
};

function indexHasSteamId() {
	try {
		return Boolean($app.findCollectionByNameOrId('lobby_player_index').fields.getByName('steam_id'));
	} catch {
		return false;
	}
}

function steamIdClause(steamIds, bindings) {
	const placeholders = [];

	for (let i = 0; i < steamIds.length; i++) {
		const key = 'sid' + String(i);
		bindings[key] = steamIds[i];
		placeholders.push('{:' + key + '}');
	}

	return `i.steam_id IN (${placeholders.join(', ')})`;
}

function queryIndexedTodayMatches(steamIds, todayStart) {
	const bindings = { todayStart };
	const rows = arrayOf(new DynamicModel(LOBBY_SHAPE));

	$app
		.db()
		.newQuery(
			`SELECT DISTINCT
           l.id,
           l.map,
           l.title,
           COALESCE(l.result, '') AS result,
           l.createdAt,
           l.isRanked,
           l.sessionId,
           l.needsResult,
           COALESCE(l.lobbyPlayers, '[]') AS lobbyPlayers,
           COALESCE(l.playerProfileIdsCsv, '') AS playerProfileIdsCsv,
           COALESCE(l.players, '[]') AS players,
           l.user,
           COALESCE(l.hasReplay, 0) AS hasReplay,
           COALESCE(l.replay, '') AS replay,
           l.updatedAt
         FROM lobby_player_index i
         INNER JOIN lobbies l ON l.id = i.lobby
         WHERE ${steamIdClause(steamIds, bindings)}
           AND l.createdAt >= {:todayStart}
         ORDER BY l.createdAt DESC`
		)
		.bind(bindings)
		.all(rows);

	return rows;
}

function queryLobbyPlayersTodayMatches(steamIds, todayStart, userId) {
	const bindings = { todayStart, userId };
	const playerClauses = [
		`json_extract(p.value, '$.steamId') IN (
			SELECT json_each.value
			FROM json_each((SELECT steamIds FROM users WHERE id = {:userId}))
		)`,
		`json_extract(p.value, '$.name') IN (
			SELECT '/steam/' || json_each.value
			FROM json_each((SELECT steamIds FROM users WHERE id = {:userId}))
		)`
	];
	const rows = arrayOf(new DynamicModel(LOBBY_SHAPE));

	$app
		.db()
		.newQuery(
			`SELECT DISTINCT
           l.id,
           l.map,
           l.title,
           COALESCE(l.result, '') AS result,
           l.createdAt,
           l.isRanked,
           l.sessionId,
           l.needsResult,
           COALESCE(l.lobbyPlayers, '[]') AS lobbyPlayers,
           COALESCE(l.playerProfileIdsCsv, '') AS playerProfileIdsCsv,
           COALESCE(l.players, '[]') AS players,
           l.user,
           COALESCE(l.hasReplay, 0) AS hasReplay,
           COALESCE(l.replay, '') AS replay,
           l.updatedAt
         FROM lobbies l,
         json_each(
           CASE
             WHEN l.lobbyPlayers IS NOT NULL AND l.lobbyPlayers != '' AND json_valid(l.lobbyPlayers)
             THEN l.lobbyPlayers
             ELSE '[]'
           END
         ) AS p
         WHERE l.createdAt >= {:todayStart}
           AND (${playerClauses.join(' OR ')})
         ORDER BY l.createdAt DESC`
		)
		.bind(bindings)
		.all(rows);

	return rows;
}

function parseJsonField(raw, fallback) {
	if (raw == null || raw === '') {
		return fallback;
	}

	if (typeof raw === 'string') {
		try {
			return JSON.parse(raw);
		} catch {
			return fallback;
		}
	}

	return raw;
}

function rowToItem(row) {
	return {
		id: row.id,
		map: row.map,
		title: row.title,
		result: parseJsonField(row.result, null),
		createdAt: row.createdAt,
		isRanked: !!row.isRanked,
		sessionId: row.sessionId,
		needsResult: !!row.needsResult,
		lobbyPlayers: parseJsonField(row.lobbyPlayers, []),
		playerProfileIdsCsv: row.playerProfileIdsCsv || '',
		players: parseJsonField(row.players, []),
		user: row.user,
		hasReplay: !!row.hasReplay,
		replay: row.replay || '',
		updatedAt: row.updatedAt
	};
}

function loadTodayMatches(userId, todayStart) {
	if (!userId) {
		return [];
	}

	const steamIds = loadUserSteamIds(userId);
	if (!steamIds.length) {
		return [];
	}

	if (!todayStart) {
		throw new Error('todayStart is required');
	}

	const rows = indexHasSteamId()
		? queryIndexedTodayMatches(steamIds, todayStart)
		: queryLobbyPlayersTodayMatches(steamIds, todayStart, userId);

	const items = [];
	for (let i = 0; i < rows.length; i++) {
		items.push(rowToItem(rows[i]));
	}

	return items;
}

module.exports = {
	loadTodayMatches
};
