'use strict';

function parsePlayers(raw) {
	if (Array.isArray(raw)) {
		return raw;
	}

	if (typeof raw === 'string') {
		try {
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? parsed : [];
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
			race_id: player.race_id
		};
	}

	const matchtypeId = Number(result.matchtype_id);
	return {
		matchtypeId: Number.isFinite(matchtypeId) ? matchtypeId : null,
		byProfile
	};
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

function applyIndexStats(record, stats, matchtypeId) {
	if (!stats) {
		return;
	}

	const outcome = Number(stats.outcome);
	if (outcome !== 0 && outcome !== 1) {
		return;
	}

	if (stats.steamId) {
		record.set('steam_id', stats.steamId);
	}
	record.set('outcome', outcome);
	if (stats.race_id != null && stats.race_id !== '') {
		record.set('race_id', Number(stats.race_id));
	}
	if (matchtypeId != null) {
		record.set('matchtype_id', matchtypeId);
	}
}

function syncLobbyPlayerIndex(lobbyId, profileIds, resultRaw, meta) {
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
	const hasMeta = meta && indexHasLobbyMeta(collection);
	for (let i = 0; i < profileIdList.length; i++) {
		const profileId = profileIdList[i];
		const record = new Record(collection);
		record.set('lobby', lobbyId);
		record.set('profile_id', profileId);
		if (hasStats) {
			applyIndexStats(record, byProfile[profileId], matchtypeId);
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

	e.record.set('lobbyPlayers', summaries);
	e.record.set('playerProfileIdsCsv', csv);
	e.record.set('hasReplay', !!e.record.get('replay'));

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
	syncLobbyPlayerIndex(e.record.id, profileIds, e.record.get('result'), meta);
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
	processLobbyRecord,
	slimLobbyPlayers,
	lobbyMeta,
	syncLobbyPlayerIndex,
	syncLobbyPlayerIndexForRecord,
	isServiceRequest
};
