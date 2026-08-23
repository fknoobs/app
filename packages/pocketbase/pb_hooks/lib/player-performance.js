'use strict';

const MATCH_CAP = 1500;
const MAP_LIMIT = 8;
const FORM_LIMIT = 10;
const CACHE_TTL_MS = 60 * 1000;
const CACHE_STORE_KEY = 'player_performance_cache_v2';

function emptyPerformance() {
	return {
		matchCount: 0,
		wins: 0,
		losses: 0,
		recentMatches: [],
		byMap: [],
		byFaction: [],
		byMode: []
	};
}

function toNumber(value) {
	if (value === null || value === undefined || value === '') {
		return null;
	}

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function bumpRecord(table, key, won, extras) {
	if (!table[key]) {
		table[key] = { wins: 0, losses: 0, ...extras };
	}

	if (won) {
		table[key].wins += 1;
	} else {
		table[key].losses += 1;
	}
}

function sortByGames(a, b) {
	return b.wins + b.losses - (a.wins + a.losses);
}

function aggregateRows(rows) {
	const seen = new Set();
	const matches = [];

	for (const row of rows) {
		const sessionId = toNumber(row.sessionId);
		if (sessionId == null || sessionId <= 0 || seen.has(sessionId)) {
			continue;
		}

		const outcome = toNumber(row.outcome);
		if (outcome !== 0 && outcome !== 1) {
			continue;
		}

		seen.add(sessionId);
		matches.push({
			id: String(row.id || ''),
			sessionId,
			map: row.map || 'Unknown',
			outcome,
			raceId: toNumber(row.raceId),
			matchtypeId: toNumber(row.matchtypeId)
		});
	}

	const byMap = {};
	const byFaction = {};
	const byMode = {};
	let wins = 0;
	let losses = 0;

	for (const match of matches) {
		const won = match.outcome === 1;
		if (won) {
			wins += 1;
		} else {
			losses += 1;
		}

		bumpRecord(byMap, match.map, won, { map: match.map });

		if (match.raceId != null && match.raceId >= 0 && match.raceId <= 3) {
			bumpRecord(byFaction, match.raceId, won, { raceId: match.raceId });
		}

		if (match.matchtypeId != null) {
			bumpRecord(byMode, match.matchtypeId, won, { matchtypeId: match.matchtypeId });
		}
	}

	return {
		matchCount: matches.length,
		wins,
		losses,
		recentMatches: matches.slice(0, FORM_LIMIT).map((match) => ({
			id: match.id,
			sessionId: match.sessionId,
			outcome: match.outcome,
			raceId: match.raceId,
			matchtypeId: match.matchtypeId
		})),
		byMap: Object.values(byMap).sort(sortByGames).slice(0, MAP_LIMIT),
		byFaction: Object.values(byFaction).sort(sortByGames),
		byMode: Object.values(byMode).sort((a, b) => {
			const aRanked = a.matchtypeId >= 1 && a.matchtypeId <= 4;
			const bRanked = b.matchtypeId >= 1 && b.matchtypeId <= 4;
			if (aRanked !== bRanked) {
				return aRanked ? -1 : 1;
			}
			return a.matchtypeId - b.matchtypeId;
		})
	};
}

function cacheKey(scope, userId, profileId) {
	return scope + ':' + (userId || '') + ':' + String(profileId);
}

function nowMs() {
	return Number(new Date());
}

function getCacheStore() {
	const raw = $app.store().get(CACHE_STORE_KEY);
	if (typeof raw === 'string' && raw) {
		try {
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed === 'object') {
				return parsed;
			}
		} catch {
			return {};
		}
	}
	return {};
}

function getCachedPerformance(key) {
	const store = getCacheStore();
	const hit = store[key];
	if (!hit) {
		return null;
	}
	if (nowMs() - hit.at > CACHE_TTL_MS) {
		delete store[key];
		$app.store().set(CACHE_STORE_KEY, JSON.stringify(store));
		return null;
	}
	return hit.value;
}

function setCachedPerformance(key, value) {
	const store = getCacheStore();
	store[key] = { at: nowMs(), value };
	$app.store().set(CACHE_STORE_KEY, JSON.stringify(store));
}

function invalidatePerformanceCache(userId, profileIds) {
	const store = getCacheStore();
	const keys = Object.keys(store);
	const userPrefix = userId ? 'user:' + userId + ':' : '';
	let changed = false;

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (userPrefix && key.indexOf(userPrefix) === 0) {
			delete store[key];
			changed = true;
			continue;
		}
		if (!profileIds) {
			continue;
		}
		for (let j = 0; j < profileIds.length; j++) {
			if (key === 'community::' + String(profileIds[j])) {
				delete store[key];
				changed = true;
			}
		}
	}

	if (changed) {
		$app.store().set(CACHE_STORE_KEY, JSON.stringify(store));
	}
}

function indexHasStatsFields() {
	try {
		return Boolean($app.findCollectionByNameOrId('lobby_player_index').fields.getByName('steam_id'));
	} catch {
		return false;
	}
}

function queryAll(sql, bindings, shape) {
	const rows = arrayOf(new DynamicModel(shape));
	$app.db().newQuery(sql).bind(bindings).all(rows);
	return rows;
}

function loadFromIndex(profileId, scope, userId) {
	const bindings = { profileId, userId, limit: MATCH_CAP };
	const filters = [
		"l.needsResult = 0",
		"l.title != 'Skirmish'",
		'i.outcome IN (0, 1)',
		"i.steam_id != ''"
	];

	if (scope === 'community') {
		filters.push('i.profile_id = {:profileId}');
	} else {
		filters.push('l.user = {:userId}');
		filters.push(`i.steam_id IN (
			SELECT json_each.value
			FROM json_each((SELECT steamIds FROM users WHERE id = {:userId}))
		)`);
	}

	return queryAll(
		`SELECT
			 l.id AS id,
			 l.sessionId AS sessionId,
			 l.map AS map,
			 i.outcome AS outcome,
			 i.race_id AS raceId,
			 i.matchtype_id AS matchtypeId
		 FROM lobbies l
		 INNER JOIN lobby_player_index i ON i.lobby = l.id
		 WHERE ${filters.join(' AND ')}
		 ORDER BY l.sessionId DESC
		 LIMIT {:limit}`,
		bindings,
		{
			id: '',
			sessionId: 0,
			map: '',
			outcome: '',
			raceId: '',
			matchtypeId: ''
		}
	);
}

function loadFromResultJson(profileId, scope, userId) {
	const bindings = { profileId, limit: MATCH_CAP };
	const lobbyFilters = ["l.needsResult = 0", "l.title != 'Skirmish'"];
	const playerClauses = ["CAST(json_extract(p.value, '$.profile_id') AS INTEGER) = {:profileId}"];

	if (scope === 'community') {
		bindings.csvNeedle = `%,${profileId},%`;
		lobbyFilters.push('l.playerProfileIdsCsv LIKE {:csvNeedle}');
	} else {
		bindings.userId = userId;
		lobbyFilters.push('l.user = {:userId}');
		playerClauses.push(`json_extract(p.value, '$.steamId') IN (
			SELECT json_each.value
			FROM json_each((SELECT steamIds FROM users WHERE id = {:userId}))
		)`);
		playerClauses.push(`json_extract(p.value, '$.name') IN (
			SELECT '/steam/' || json_each.value
			FROM json_each((SELECT steamIds FROM users WHERE id = {:userId}))
		)`);
	}

	return queryAll(
		`SELECT
			 l.id AS id,
			 l.sessionId AS sessionId,
			 l.map AS map,
			 json_extract(p.value, '$.outcome') AS outcome,
			 json_extract(p.value, '$.race_id') AS raceId,
			 json_extract(l.result, '$.matchtype_id') AS matchtypeId
		 FROM lobbies l,
					json_each(
						CASE
							WHEN l.result IS NOT NULL AND l.result != ''
									 AND json_valid(l.result)
									 AND json_type(json_extract(l.result, '$.players')) = 'array'
							THEN json_extract(l.result, '$.players')
							ELSE '[]'
						END
					) AS p
		 WHERE ${lobbyFilters.join(' AND ')}
			 AND (${playerClauses.join(' OR ')})
		 ORDER BY l.sessionId DESC
		 LIMIT {:limit}`,
		bindings,
		{
			id: '',
			sessionId: 0,
			map: '',
			outcome: '',
			raceId: '',
			matchtypeId: ''
		}
	);
}

function rowsToRecentMatches(rows) {
	const seen = new Set();
	const recent = [];
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const sessionId = toNumber(row.sessionId);
		const outcome = toNumber(row.outcome);
		if (sessionId == null || sessionId <= 0 || seen.has(sessionId)) {
			continue;
		}
		if (outcome !== 0 && outcome !== 1) {
			continue;
		}
		seen.add(sessionId);
		recent.push({
			id: String(row.id || ''),
			sessionId,
			outcome,
			raceId: toNumber(row.raceId),
			matchtypeId: toNumber(row.matchtypeId)
		});
	}
	return recent;
}

function loadRecentMatches(profileId, scope, userId) {
	const recentShape = {
		id: '',
		sessionId: 0,
		outcome: '',
		raceId: '',
		matchtypeId: ''
	};

	if (scope === 'community' && indexHasStatsFields()) {
		return rowsToRecentMatches(
			queryAll(
				`SELECT
					 l.id AS id,
					 l.sessionId AS sessionId,
					 i.outcome AS outcome,
					 i.race_id AS raceId,
					 i.matchtype_id AS matchtypeId
				 FROM lobby_player_index i
				 INNER JOIN lobbies l ON l.id = i.lobby
				 WHERE i.profile_id = {:profileId}
					 AND l.needsResult = 0
					 AND l.title != 'Skirmish'
					 AND i.outcome IN (0, 1)
				 ORDER BY l.sessionId DESC
				 LIMIT {:formLimit}`,
				{ profileId, formLimit: FORM_LIMIT },
				recentShape
			)
		);
	}

	const bindings = { profileId, userId, lobbyLimit: 50, formLimit: FORM_LIMIT };
	const playerClauses = ["CAST(json_extract(p.value, '$.profile_id') AS INTEGER) = {:profileId}"];
	const lobbySql = `SELECT id, sessionId, result
		 FROM lobbies
		 WHERE needsResult = 0 AND title != 'Skirmish' AND user = {:userId}
		 ORDER BY sessionId DESC
		 LIMIT {:lobbyLimit}`;
	playerClauses.push(`json_extract(p.value, '$.steamId') IN (
		SELECT json_each.value
		FROM json_each((SELECT steamIds FROM users WHERE id = {:userId}))
	)`);
	playerClauses.push(`json_extract(p.value, '$.name') IN (
		SELECT '/steam/' || json_each.value
		FROM json_each((SELECT steamIds FROM users WHERE id = {:userId}))
	)`);

	return rowsToRecentMatches(
		queryAll(
			`SELECT
				 l.id AS id,
				 l.sessionId AS sessionId,
				 json_extract(p.value, '$.outcome') AS outcome,
				 json_extract(p.value, '$.race_id') AS raceId,
				 json_extract(l.result, '$.matchtype_id') AS matchtypeId
			 FROM (
				 ${lobbySql}
			 ) AS l,
			 json_each(
				 CASE
					 WHEN l.result IS NOT NULL AND l.result != ''
								AND json_valid(l.result)
								AND json_type(json_extract(l.result, '$.players')) = 'array'
					 THEN json_extract(l.result, '$.players')
					 ELSE '[]'
				 END
			 ) AS p
			 WHERE (${playerClauses.join(' OR ')})
				 AND CAST(json_extract(p.value, '$.outcome') AS INTEGER) IN (0, 1)
			 ORDER BY l.sessionId DESC
			 LIMIT {:formLimit}`,
			bindings,
			recentShape
		)
	);
}

function loadPlayerPerformance(profileId, scope, userId) {
	const key = cacheKey(scope, userId, profileId);
	const cached = getCachedPerformance(key);
	if (cached) {
		return cached;
	}

	let data;
	try {
		data = aggregateRows(
			indexHasStatsFields()
				? loadFromIndex(profileId, scope, userId)
				: loadFromResultJson(profileId, scope, userId)
		);
	} catch (error) {
		console.warn('[player_performance] index query failed, using result json:', String(error?.message || error));
		data = aggregateRows(loadFromResultJson(profileId, scope, userId));
	}

	try {
		data.recentMatches = loadRecentMatches(profileId, scope, userId);
	} catch (error) {
		console.warn('[player_performance] recent matches failed:', String(error?.message || error));
	}

	setCachedPerformance(key, data);
	return data;
}

module.exports = {
	emptyPerformance,
	loadPlayerPerformance,
	invalidatePerformanceCache
};
