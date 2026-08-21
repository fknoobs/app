'use strict';

const COLLECTION = 'player_ratings';
const STEAM_ID_REGEX = /^7656119\d{10}$/;
const MIN_STORED_MATCH_TYPE = 0;
const MAX_STORED_MATCH_TYPE = 7;
const MAX_INGEST_PLAYERS = 64;

function isServiceRequest(e) {
	const token = $os.getenv('SMURF_SERVICE_TOKEN') || '';
	if (!token) {
		return false;
	}

	const auth = e.request.header.get('Authorization') || '';
	return auth === `Bearer ${token}`;
}

function readRequestJsonBody(e) {
	try {
		const raw = toString(e.request.body);
		if (raw) {
			return JSON.parse(raw);
		}
	} catch (error) {
		console.log('[player_ratings] failed to parse raw request body', String(error));
	}

	try {
		const body = e.requestInfo()?.body;
		if (body && typeof body === 'object') {
			return body;
		}
	} catch (error) {
		console.log('[player_ratings] failed to read requestInfo body', String(error));
	}

	return {};
}

function isStoredMatchType(matchtypeId) {
	const id = Number(matchtypeId);
	return Number.isInteger(id) && id >= MIN_STORED_MATCH_TYPE && id <= MAX_STORED_MATCH_TYPE;
}

function isValidSteamId(value) {
	return typeof value === 'string' && STEAM_ID_REGEX.test(value);
}

function parseJson(raw, fallback) {
	if (raw == null || raw === '') {
		return fallback;
	}

	if (typeof raw === 'object') {
		return raw;
	}

	if (typeof raw === 'string') {
		try {
			return JSON.parse(raw);
		} catch {
			return fallback;
		}
	}

	return fallback;
}

function normalizeSlot(raw) {
	const matchtypeId = Number(raw?.matchtypeId ?? raw?.matchtype_id);
	const raceId = Number(raw?.raceId ?? raw?.race_id);
	const rating = Number(raw?.rating ?? raw?.newrating);
	const matchId = Number(raw?.matchId ?? raw?.match_id ?? raw?.id);
	const at = Number(raw?.at ?? raw?.completiontime ?? 0);

	if (!isStoredMatchType(matchtypeId)) {
		return null;
	}

	if (!Number.isInteger(raceId) || raceId < 0 || raceId > 3) {
		return null;
	}

	if (!Number.isFinite(rating) || rating < 1) {
		return null;
	}

	if (!Number.isFinite(matchId) || matchId <= 0) {
		return null;
	}

	if (!Number.isFinite(at) || at < 0) {
		return null;
	}

	return { matchtypeId, raceId, rating, matchId, at };
}

function mergeElo(existing, slots) {
	const elo = parseJson(existing, {}) || {};
	const next = typeof elo === 'object' && !Array.isArray(elo) ? { ...elo } : {};

	for (const slot of slots) {
		const matchKey = String(slot.matchtypeId);
		const raceKey = String(slot.raceId);
		const currentGroup =
			next[matchKey] && typeof next[matchKey] === 'object' && !Array.isArray(next[matchKey])
				? { ...next[matchKey] }
				: {};
		const current = currentGroup[raceKey];

		if (!current || slot.at > Number(current.at || 0)) {
			currentGroup[raceKey] = {
				rating: slot.rating,
				matchId: slot.matchId,
				at: slot.at
			};
			next[matchKey] = currentGroup;
		}
	}

	return next;
}

function serializeRecord(record) {
	if (!record) {
		return null;
	}

	return {
		id: record.id,
		steamId: record.get('steamId'),
		profileId: record.get('profileId'),
		alias: record.get('alias'),
		elo: parseJson(record.get('elo'), {}) || {}
	};
}

function findBySteamId(steamId) {
	try {
		return $app.findFirstRecordByFilter(COLLECTION, 'steamId = {:steamId}', { steamId });
	} catch {
		return null;
	}
}

function upsertPlayerRating({ steamId, profileId, alias, slots }) {
	if (!isValidSteamId(steamId) || !slots?.length) {
		return null;
	}

	const resolvedProfileId = Number(profileId);
	if (!Number.isInteger(resolvedProfileId) || resolvedProfileId <= 0) {
		return null;
	}

	const resolvedAlias = typeof alias === 'string' ? alias.trim() : '';
	if (!resolvedAlias) {
		return null;
	}

	const existing = findBySteamId(steamId);
	const merged = mergeElo(existing?.get('elo'), slots);

	if (existing) {
		existing.set('profileId', resolvedProfileId);
		existing.set('alias', resolvedAlias);
		existing.set('elo', merged);
		$app.save(existing);
		return existing;
	}

	const collection = $app.findCollectionByNameOrId(COLLECTION);
	const record = new Record(collection);
	record.set('steamId', steamId);
	record.set('profileId', resolvedProfileId);
	record.set('alias', resolvedAlias);
	record.set('elo', merged);
	$app.save(record);
	return record;
}

function extractPlayersFromMatch(result) {
	const match = parseJson(result, null);
	if (!match || !isStoredMatchType(match.matchtype_id)) {
		return [];
	}

	const at = Number(match.completiontime ?? match.startgametime ?? 0);
	const matchId = Number(match.id);
	const players = Array.isArray(match.players) ? match.players : [];
	const bySteam = {};

	for (const player of players) {
		const steamId = player?.steamId || (typeof player?.name === 'string' ? player.name.replace('/steam/', '') : '');
		const slot = normalizeSlot({
			matchtypeId: match.matchtype_id,
			raceId: player?.race_id,
			rating: player?.newrating,
			matchId,
			at
		});

		if (!isValidSteamId(steamId) || !slot) {
			continue;
		}

		bySteam[steamId] = {
			steamId,
			profileId: player?.profile_id,
			alias: player?.alias,
			slots: [slot]
		};
	}

	return Object.values(bySteam);
}

function ingestLobbyResult(result) {
	const players = extractPlayersFromMatch(result);
	const records = [];

	for (const player of players) {
		try {
			const record = upsertPlayerRating(player);
			if (record) {
				records.push(record);
			}
		} catch (error) {
			console.log('[player_ratings] upsert failed', player.steamId, String(error));
		}
	}

	return records;
}

function ingestLobbyRecord(e) {
	try {
		if (e.record.get('title') === 'Skirmish') {
			return;
		}

		const result = e.record.get('result');
		if (!result) {
			return;
		}

		ingestLobbyResult(result);
	} catch (error) {
		console.log('[player_ratings] lobby hook failed', e.record?.id, String(error));
	}
}

function handleGetBySteamId(e) {
	const steamId = e.request.pathValue('steamId');
	if (!isValidSteamId(steamId) || steamId === 'backfill') {
		return e.json(400, { message: 'steamId is required' });
	}

	const record = findBySteamId(steamId);
	if (!record) {
		return e.json(404, { message: 'Not found' });
	}

	return e.json(200, serializeRecord(record));
}

function handleIngest(e) {
	if (!e.auth?.id && !e.hasSuperuserAuth() && !isServiceRequest(e)) {
		return e.json(401, { message: 'Unauthorized' });
	}

	const body = readRequestJsonBody(e);
	const players = Array.isArray(body?.players) ? body.players : [];

	if (players.length === 0) {
		return e.json(400, { message: 'players is required' });
	}

	if (players.length > MAX_INGEST_PLAYERS) {
		return e.json(400, { message: `players cannot exceed ${MAX_INGEST_PLAYERS}` });
	}

	const records = [];

	for (const player of players) {
		const steamId = String(player?.steamId || player?.steam_id || '');
		const slots = Array.isArray(player?.slots)
			? player.slots.map(normalizeSlot).filter(Boolean)
			: [];

		try {
			const record = upsertPlayerRating({
				steamId,
				profileId: player?.profileId ?? player?.profile_id,
				alias: player?.alias,
				slots
			});

			if (record) {
				records.push(serializeRecord(record));
			}
		} catch (error) {
			console.log('[player_ratings] ingest failed', steamId, String(error));
		}
	}

	return e.json(200, { players: records });
}

module.exports = {
	COLLECTION,
	isServiceRequest,
	isStoredMatchType,
	isValidSteamId,
	parseJson,
	ingestLobbyRecord,
	ingestLobbyResult,
	handleGetBySteamId,
	handleIngest,
	serializeRecord
};
