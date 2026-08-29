'use strict';

function parsePlayers(raw) {
	if (Array.isArray(raw)) {
		return raw;
	}

	if (raw && typeof raw === 'object') {
		try {
			const asArray = Array.from(raw);
			if (asArray.length > 0 || (typeof raw.length === 'number' && raw.length === 0)) {
				return asArray;
			}
		} catch {
			// not iterable
		}

		const keys = Object.keys(raw);
		if (keys.length > 0 && keys.every((key) => /^\d+$/.test(key))) {
			return keys
				.sort((a, b) => Number(a) - Number(b))
				.map((key) => raw[key]);
		}
	}

	if (typeof raw === 'string') {
		if (!raw || raw === '[]' || raw === 'null') {
			return [];
		}
		try {
			return parsePlayers(JSON.parse(raw));
		} catch {
			return [];
		}
	}

	return [];
}

/**
 * Per-player keys that are written by the client but never read back from a
 * saved lobby. `matchHistory` alone accounted for ~438 KB per lobby row, which
 * made every query touching `lobbies` read hundreds of megabytes.
 */
const HEAVY_PLAYER_KEYS = ['matchHistory', 'storedElo'];

function slimLobbyPlayers(players) {
	let changed = false;
	const slimmed = [];

	for (const player of players) {
		if (!player || typeof player !== 'object') {
			slimmed.push(player);
			continue;
		}

		let stripped = null;
		for (const key of HEAVY_PLAYER_KEYS) {
			if (player[key] === undefined) {
				continue;
			}
			if (!stripped) {
				stripped = Object.assign({}, player);
			}
			delete stripped[key];
			changed = true;
		}

		slimmed.push(stripped || player);
	}

	return { players: slimmed, changed };
}

function summarizeLobbyPlayers(players) {
	const summaries = [];
	const ids = [];

	for (const player of players) {
		const fromProfile = player?.profile?.profile_id;
		const fromPlayerId = player?.playerId != null && player.playerId > 0 ? player.playerId : null;
		const profileId = fromProfile != null ? fromProfile : fromPlayerId;
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

function parseResultPlayerStats(raw) {
	let result = raw;
	if (typeof raw === 'string') {
		if (!raw) {
			return { matchtypeId: null, byProfile: {} };
		}
		try {
			result = JSON.parse(raw);
		} catch {
			return { matchtypeId: null, byProfile: {} };
		}
	}
	if (!result || typeof result !== 'object') {
		return { matchtypeId: null, byProfile: {} };
	}

	const byProfile = {};
	const players = Array.isArray(result.players) ? result.players : [];
	for (const player of players) {
		const profileId = Number(player?.profile_id);
		if (!Number.isFinite(profileId) || profileId <= 0) {
			continue;
		}

		let steamId = player.steamId ? String(player.steamId) : '';
		if (!steamId && typeof player.name === 'string' && player.name.indexOf('/steam/') === 0) {
			steamId = player.name.slice('/steam/'.length);
		}

		byProfile[profileId] = {
			steamId,
			outcome: player.outcome,
			race_id: player.race_id,
			elo: playerMatchElo(player)
		};
	}

	const matchtypeId = Number(result.matchtype_id);
	return {
		matchtypeId: Number.isFinite(matchtypeId) ? matchtypeId : null,
		byProfile,
		durationSeconds: durationSecondsFromResult(result),
		avgElo: averageEloFromResult(result)
	};
}

function playerMatchElo(player) {
	const previous = Number(player?.oldrating);
	if (Number.isFinite(previous) && previous >= 1) {
		return previous;
	}
	const next = Number(player?.newrating);
	if (Number.isFinite(next) && next >= 1) {
		return next;
	}
	return null;
}

function durationSecondsFromResult(result) {
	const start = Number(result?.startgametime);
	const end = Number(result?.completiontime);
	if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
		return null;
	}
	return end - start;
}

function averageEloFromResult(result) {
	const players = Array.isArray(result?.players) ? result.players : [];
	if (players.length === 0) {
		return null;
	}
	const ratings = [];
	for (let i = 0; i < players.length; i++) {
		const rating = playerMatchElo(players[i]);
		if (rating != null) {
			ratings.push(rating);
		}
	}
	if (ratings.length < 2 || ratings.length < players.length / 2) {
		return null;
	}
	let sum = 0;
	for (let i = 0; i < ratings.length; i++) {
		sum += ratings[i];
	}
	return sum / ratings.length;
}

function parseResultObject(raw) {
	if (!raw) {
		return null;
	}
	if (typeof raw === 'object') {
		return raw;
	}
	if (typeof raw === 'string') {
		if (!raw) {
			return null;
		}
		try {
			return JSON.parse(raw);
		} catch {
			return null;
		}
	}
	return null;
}

function applyLobbyFilterStats(record, resultRaw) {
	const parsed = parseResultObject(resultRaw);
	if (!parsed) {
		return;
	}
	const durationSeconds = durationSecondsFromResult(parsed);
	const avgElo = averageEloFromResult(parsed);
	if (durationSeconds != null) {
		record.set('durationSeconds', durationSeconds);
	}
	if (avgElo != null) {
		record.set('avgElo', avgElo);
	}
}

function backfillLobbyPlayerElo(lobbyId) {
	if (!lobbyId) {
		return;
	}
	$app
		.db()
		.newQuery(
			`UPDATE lobby_player_index
			 SET elo = (
				SELECT COALESCE(
					NULLIF(CAST(json_extract(p.value, '$.oldrating') AS INTEGER), 0),
					CAST(json_extract(p.value, '$.newrating') AS INTEGER)
				)
				FROM lobbies l,
				json_each(
					CASE
						WHEN l.result IS NOT NULL AND l.result != ''
							AND json_valid(l.result)
							AND json_type(json_extract(l.result, '$.players')) = 'array'
						THEN json_extract(l.result, '$.players')
						ELSE '[]'
					END
				) p
				WHERE l.id = lobby_player_index.lobby
				  AND CAST(json_extract(p.value, '$.profile_id') AS INTEGER) = lobby_player_index.profile_id
				LIMIT 1
			 )
			 WHERE lobby = {:lobbyId}
			   AND (elo IS NULL OR elo = 0)`
		)
		.bind({ lobbyId })
		.execute();
}

function normalizeMapName(mapName) {
	if (!mapName) {
		return '';
	}
	const match = String(mapName).match(/^(\d+)[pP][ _](.+)$/);
	if (!match) {
		return String(mapName).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}
	const formattedName = match[2]
		.replace(/_/g, ' ')
		.toLowerCase()
		.replace(/\b\w/g, (c) => c.toUpperCase());
	return `${formattedName} (${match[1]})`;
}

function upsertHistoryMap(map) {
	if (!map) {
		return;
	}
	let collection;
	try {
		collection = $app.findCollectionByNameOrId('maps');
	} catch {
		return;
	}
	try {
		const existing = $app.findFirstRecordByData('maps', 'map', String(map));
		const name = normalizeMapName(map);
		if (name && existing.get('name') !== name) {
			existing.set('name', name);
			$app.save(existing);
		}
	} catch {
		const record = new Record(collection);
		record.set('map', String(map));
		record.set('name', normalizeMapName(map));
		$app.save(record);
	}
}

function upsertHistoryPlayers(summaries) {
	if (!summaries || summaries.length === 0) {
		return;
	}
	let collection;
	try {
		collection = $app.findCollectionByNameOrId('players');
	} catch {
		return;
	}
	for (let i = 0; i < summaries.length; i++) {
		const summary = summaries[i];
		const profileId = Number(summary?.profile_id);
		if (!Number.isFinite(profileId) || profileId <= 0) {
			continue;
		}
		const alias = String(summary.alias || '').trim();
		const steamId = summary.steamId ? String(summary.steamId) : '';
		try {
			const existing = $app.findFirstRecordByData('players', 'profile_id', profileId);
			let changed = false;
			if (alias && existing.get('alias') !== alias) {
				existing.set('alias', alias);
				changed = true;
			}
			if (steamId && existing.get('steam_id') !== steamId) {
				existing.set('steam_id', steamId);
				changed = true;
			}
			if (changed) {
				$app.save(existing);
			}
		} catch {
			const record = new Record(collection);
			record.set('profile_id', profileId);
			record.set('alias', alias);
			if (steamId) {
				record.set('steam_id', steamId);
			}
			$app.save(record);
		}
	}
}

function upsertHistoryCatalog(summaries, map) {
	upsertHistoryMap(map);
	upsertHistoryPlayers(summaries);
}

function indexHasStatsFields(collection) {
	return Boolean(collection.fields.getByName('steam_id'));
}

function indexHasLobbyMeta(collection) {
	return Boolean(collection.fields.getByName('session_id'));
}

/** Denormalized copy of the lobby columns the performance aggregation needs. */
function lobbyMeta(sessionId, map, user, needsResult, title) {
	const parsedSession = Number(sessionId);
	return {
		sessionId: Number.isFinite(parsedSession) ? parsedSession : 0,
		map: map ? String(map) : '',
		user: user ? String(user) : '',
		counts: !needsResult && title !== 'Skirmish'
	};
}

function applyLobbyMeta(record, meta) {
	if (!meta) {
		return;
	}

	record.set('session_id', meta.sessionId);
	record.set('map', meta.map);
	record.set('lobby_user', meta.user);
	record.set('counts', meta.counts);
}

function applyIndexStats(record, stats, matchtypeId, hasElo) {
	if (!stats) {
		return;
	}

	if (stats.steamId) {
		record.set('steam_id', stats.steamId);
	}
	const outcome = Number(stats.outcome);
	if (outcome === 0 || outcome === 1) {
		record.set('outcome', outcome);
	}
	if (stats.race_id != null && stats.race_id !== '') {
		record.set('race_id', Number(stats.race_id));
	}
	if (matchtypeId != null) {
		record.set('matchtype_id', matchtypeId);
	}
	if (hasElo && stats.elo != null) {
		record.set('elo', stats.elo);
	}
}

function displaySlotFromPlayer(player) {
	const slot = Number(player?.slot);
	if (!Number.isFinite(slot) || slot < 0 || slot > 7) {
		return null;
	}
	return slot + 1;
}

function slotsByProfileFromPlayers(playersRaw) {
	const byProfile = {};
	const players = parsePlayers(playersRaw);
	for (let i = 0; i < players.length; i++) {
		const player = players[i];
		const displaySlot = displaySlotFromPlayer(player);
		if (displaySlot == null) {
			continue;
		}
		const ids = [player.playerId, player.profile_id, player.profile?.profile_id];
		for (let j = 0; j < ids.length; j++) {
			const profileId = Number(ids[j]);
			if (Number.isFinite(profileId) && profileId > 0) {
				byProfile[profileId] = displaySlot;
			}
		}
	}
	return byProfile;
}

function backfillLobbyPlayerSlot(lobbyId) {
	if (!lobbyId) {
		return;
	}
	$app
		.db()
		.newQuery(
			`UPDATE lobby_player_index
			 SET slot = (
				SELECT CAST(json_extract(p.value, '$.slot') AS INTEGER) + 1
				FROM lobbies l,
				json_each(
					CASE
						WHEN l.players IS NOT NULL AND l.players != '' AND l.players != '[]'
							AND json_valid(l.players)
						THEN l.players
						ELSE '[]'
					END
				) p
				WHERE l.id = lobby_player_index.lobby
				  AND CAST(COALESCE(
					json_extract(p.value, '$.playerId'),
					json_extract(p.value, '$.profile.profile_id'),
					json_extract(p.value, '$.profile_id')
				  ) AS INTEGER) = lobby_player_index.profile_id
				  AND json_extract(p.value, '$.slot') IS NOT NULL
				LIMIT 1
			 )
			 WHERE lobby = {:lobbyId}
			   AND (slot IS NULL OR slot = 0)`
		)
		.bind({ lobbyId })
		.execute();
}

function syncLobbyPlayerIndex(lobbyId, profileIds, resultRaw, meta, playersRaw) {
	let collection;
	try {
		collection = $app.findCollectionByNameOrId('lobby_player_index');
	} catch {
		return;
	}

	$app
		.db()
		.newQuery('DELETE FROM lobby_player_index WHERE lobby = {:lobbyId}')
		.bind({ lobbyId })
		.execute();

	const { matchtypeId, byProfile } = parseResultPlayerStats(resultRaw);
	const uniqueIds = {};
	for (const id of profileIds || []) {
		const profileId = Number(id);
		if (!Number.isNaN(profileId) && profileId > 0) {
			uniqueIds[profileId] = true;
		}
	}
	for (const key in byProfile) {
		uniqueIds[Number(key)] = true;
	}

	const profileIdList = [];
	for (const key in uniqueIds) {
		profileIdList.push(Number(key));
	}
	if (profileIdList.length === 0) {
		return;
	}

	const hasStats = indexHasStatsFields(collection);
	const hasElo = Boolean(collection.fields.getByName('elo'));
	const hasSlot = Boolean(collection.fields.getByName('slot'));
	const hasMeta = meta && indexHasLobbyMeta(collection);
	const slotsByProfile = hasSlot ? slotsByProfileFromPlayers(playersRaw) : {};
	for (let i = 0; i < profileIdList.length; i++) {
		const profileId = profileIdList[i];
		const record = new Record(collection);
		record.set('lobby', lobbyId);
		record.set('profile_id', profileId);
		if (hasStats) {
			applyIndexStats(record, byProfile[profileId], matchtypeId, hasElo);
		} else if (hasElo && byProfile[profileId]?.elo != null) {
			record.set('elo', byProfile[profileId].elo);
		}
		if (hasSlot && slotsByProfile[profileId] != null) {
			record.set('slot', slotsByProfile[profileId]);
		}
		if (hasMeta) {
			applyLobbyMeta(record, meta);
		}
		$app.save(record);
	}
}

function updateCommunitySnapshot(summaries, map) {
	if (!map && summaries.length === 0) {
		return;
	}

	try {
		const snapshot = $app.findRecordById('match_filter_snapshots', 'community');
		const maps = snapshot.get('maps') || [];
		const snapshotPlayers = snapshot.get('players') || [];

		if (map && !maps.includes(map)) {
			maps.push(map);
			maps.sort();
		}

		for (const summary of summaries) {
			if (!snapshotPlayers.some((player) => player.profile_id === summary.profile_id)) {
				snapshotPlayers.push(summary);
			}
		}

		snapshotPlayers.sort((a, b) => String(a.alias).localeCompare(String(b.alias)));
		snapshot.set('maps', maps);
		snapshot.set('players', snapshotPlayers);
		$app.save(snapshot);
	} catch {
		// snapshot not ready yet
	}
}

function processLobbyRecord(e) {
	const players = parsePlayers(e.record.get('players'));
	const slim = slimLobbyPlayers(players);
	if (slim.changed) {
		e.record.set('players', slim.players);
	}

	const { summaries, csv, ids } = summarizeLobbyPlayers(slim.players);

	// Never wipe populated filter fields when players failed to parse (e.g. multipart
	// edge cases). Empty summaries would otherwise clear lobbyPlayers on every update.
	if (summaries.length > 0) {
		e.record.set('lobbyPlayers', summaries);
		e.record.set('playerProfileIdsCsv', csv);
	}

	e.record.set('hasReplay', !!e.record.get('replay'));
	applyLobbyFilterStats(e.record, e.record.get('result'));

	if (
		!e.record.get('needsResult') &&
		e.record.get('title') !== 'Skirmish' &&
		e.record.get('replay')
	) {
		updateCommunitySnapshot(summaries, e.record.get('map'));
	}

	return ids;
}

function syncLobbyPlayerIndexForRecord(e) {
	const summaries = e.record.get('lobbyPlayers') || [];
	const profileIds = summaries.map((player) => player.profile_id);
	const meta = lobbyMeta(
		e.record.get('sessionId'),
		e.record.get('map'),
		e.record.get('user'),
		e.record.get('needsResult'),
		e.record.get('title')
	);
	syncLobbyPlayerIndex(e.record.id, profileIds, e.record.get('result'), meta, e.record.get('players'));
	if (!e.record.get('needsResult') && e.record.get('title') !== 'Skirmish') {
		upsertHistoryCatalog(summaries, e.record.get('map'));
	}
	try {
		require(`${__hooks}/lib/player-performance.js`).invalidatePerformanceCache(
			e.record.get('user') || '',
			profileIds
		);
	} catch {
		// performance hook not loaded
	}
}

function isServiceRequest(e) {
	const token = $os.getenv('SMURF_SERVICE_TOKEN') || '';
	if (!token) {
		return false;
	}

	const auth = e.request.header.get('Authorization') || '';
	return auth === `Bearer ${token}`;
}

module.exports = {
	parsePlayers,
	processLobbyRecord,
	slimLobbyPlayers,
	lobbyMeta,
	syncLobbyPlayerIndex,
	syncLobbyPlayerIndexForRecord,
	upsertHistoryCatalog,
	applyLobbyFilterStats,
	backfillLobbyPlayerElo,
	backfillLobbyPlayerSlot,
	isServiceRequest
};
