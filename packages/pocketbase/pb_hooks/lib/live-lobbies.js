// Public live companion lobbies for coh1stats.com.
'use strict';

const { LOBBIES_LIVE_STALE_MS } = require(`${__hooks}/lib/lobbies-live.js`);
const { parseJsonArray } = require(`${__hooks}/lib/match-filters.js`);

const ALLOWED_ORIGINS = [
	'https://coh1stats.com',
	'https://www.coh1stats.com',
	'http://localhost:5174',
	'http://127.0.0.1:5174'
];
const LIST_LIMIT = 48;
const HTTP_CACHE_CONTROL = 'public, max-age=10, s-maxage=15, stale-while-revalidate=60';

function applyCors(e) {
	const origin = e.request.header.get('Origin');
	if (origin && ALLOWED_ORIGINS.includes(origin)) {
		e.response.header().set('Access-Control-Allow-Origin', origin);
		e.response.header().set('Vary', 'Origin');
	}
	e.response.header().set('Access-Control-Allow-Methods', 'GET, OPTIONS');
	e.response.header().set('Access-Control-Allow-Headers', 'Content-Type');
}

function jsonWithCors(e, status, body, cacheControl) {
	applyCors(e);
	if (cacheControl) {
		e.response.header().set('Cache-Control', cacheControl);
	}
	return e.json(status, body);
}

function toFiniteNumber(value) {
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

/**
 * Relic logs closed/empty slots as Id -1 with Type 3 or 6.
 * Real skirmish AI is Id -1 with Type 1. Replay placeholders use Id 0.
 * Nested matchHistory[].players members have profile_id/race_id, not playerId.
 */
function isOccupiedLobbySlot(player) {
	if (!player || typeof player !== 'object' || Array.isArray(player)) {
		return false;
	}
	if (player.race_id != null && player.playerId == null && player.type == null) {
		return false;
	}
	const playerId = toFiniteNumber(player.playerId);
	if (playerId == null) {
		return false;
	}
	if (playerId === -1) {
		return toFiniteNumber(player.type) === 1;
	}
	if (playerId === 0) {
		return false;
	}
	return true;
}

function slimPlayer(player, fallbackIndex) {
	const playerId = toFiniteNumber(player.playerId);
	const race = toFiniteNumber(player.race);
	const type = toFiniteNumber(player.type);
	const index = toFiniteNumber(player.index) ?? fallbackIndex;
	if (playerId == null || race == null || race < 0 || race > 3) {
		return null;
	}
	const profileIdRaw = player?.profile?.profile_id ?? (playerId > 0 ? playerId : null);
	const profileId = toFiniteNumber(profileIdRaw);
	const alias = String(player?.profile?.alias || player?.name || '').trim();
	return {
		index,
		playerId,
		type: type ?? 0,
		race,
		alias,
		profileId: profileId != null && profileId > 0 ? profileId : null,
		steamId: player?.steamId ? String(player.steamId) : null
	};
}

function slimPlayers(value) {
	const raw = parseJsonArray(value);
	const seenSlot = {};
	const items = [];
	for (let i = 0; i < raw.length; i++) {
		const player = raw[i];
		if (!isOccupiedLobbySlot(player)) {
			continue;
		}
		const slim = slimPlayer(player, i);
		if (!slim) {
			continue;
		}
		const slot = slim.index;
		if (slot >= 0 && slot <= 7) {
			if (seenSlot[slot]) {
				continue;
			}
			seenSlot[slot] = true;
		}
		items.push(slim);
		if (items.length >= 8) {
			break;
		}
	}
	return items;
}

function hostName(userId) {
	if (!userId) {
		return '';
	}
	try {
		const user = $app.findRecordById('users', userId);
		return String(user.get('name') || '').trim();
	} catch {
		return '';
	}
}

function toPublicItem(record) {
	return {
		id: record.id,
		sessionId: String(record.get('sessionId') || ''),
		map: String(record.get('map') || ''),
		isRanked: Boolean(record.get('isRanked')),
		createdAt: String(record.get('createdAt') || ''),
		updatedAt: String(record.get('updatedAt') || ''),
		hostName: hostName(record.get('user')),
		players: slimPlayers(record.get('players'))
	};
}

function isPublicLiveLobby(record) {
	if (record.get('isReplay')) {
		return false;
	}

	const updatedAt = new Date(String(record.get('updatedAt') || '')).getTime();
	return Number.isFinite(updatedAt) && Date.now() - updatedAt < LOBBIES_LIVE_STALE_MS;
}

function getPublicLobby(id) {
	let record;
	try {
		record = $app.findRecordById('lobbies_live', id);
	} catch {
		return null;
	}

	if (!isPublicLiveLobby(record)) {
		return null;
	}

	return toPublicItem(record);
}

function listPublicLobbies() {
	const since = new Date(Date.now() - LOBBIES_LIVE_STALE_MS).toISOString().replace('T', ' ');
	const records = $app.findRecordsByFilter(
		'lobbies_live',
		'updatedAt > {:since} && isReplay != true',
		'-updatedAt',
		LIST_LIMIT,
		0,
		{ since }
	);
	const seen = {};
	const items = [];
	for (const record of records) {
		const sessionId = String(record.get('sessionId') || '');
		if (!sessionId || seen[sessionId]) {
			continue;
		}
		seen[sessionId] = true;
		items.push(toPublicItem(record));
	}
	return items;
}

function handleOptions(e) {
	applyCors(e);
	return e.noContent(204);
}

function handleList(e) {
	try {
		return jsonWithCors(e, 200, { items: listPublicLobbies() }, HTTP_CACHE_CONTROL);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn('[live_lobbies] list failed:', message);
		return jsonWithCors(e, 500, { message: 'Failed to load live lobbies' });
	}
}

function handleGet(e) {
	try {
		const lobby = getPublicLobby(e.request.pathValue('id'));
		if (!lobby) {
			return jsonWithCors(e, 404, { message: 'Live lobby not found' });
		}

		return jsonWithCors(e, 200, lobby, HTTP_CACHE_CONTROL);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn('[live_lobbies] get failed:', message);
		return jsonWithCors(e, 500, { message: 'Failed to load live lobby' });
	}
}

module.exports = {
	handleOptions,
	handleList,
	handleGet
};
