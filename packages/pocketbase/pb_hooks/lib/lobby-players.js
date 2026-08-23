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

function syncLobbyPlayerIndex(lobbyId, profileIds, resultRaw) {
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
	for (let i = 0; i < profileIdList.length; i++) {
		const profileId = profileIdList[i];
		const record = new Record(collection);
		record.set('lobby', lobbyId);
		record.set('profile_id', profileId);
		if (hasStats) {
			applyIndexStats(record, byProfile[profileId], matchtypeId);
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
	const { summaries, csv, ids } = summarizeLobbyPlayers(players);

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
	syncLobbyPlayerIndex(e.record.id, profileIds, e.record.get('result'));
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
	syncLobbyPlayerIndex,
	syncLobbyPlayerIndexForRecord,
	isServiceRequest
};
