'use strict';

const matchHistory = require(`${__hooks}/lib/match-history.js`);

const RELIC_API_BASE = 'https://coh1-lobby.reliclink.com';
const FETCH_SCRIPT = `${__hooks}/lib/fetch-insecure.py`;
const COLLECTION = 'lobbies';
const BATCH_SIZE = 40;
const MAX_PROFILE_FETCHES = 5;
const MAX_ATTEMPTS = 5;

function matchHistoryUrl(profileId) {
	return (
		`${RELIC_API_BASE}/community/leaderboard/getrecentmatchhistorybyprofileid` +
		`?title=coh1&profile_id=${encodeURIComponent(String(profileId))}`
	);
}

function parseNdjson(raw) {
	const byUrl = {};
	const text = String(raw || '');
	if (!text.trim()) {
		return byUrl;
	}

	for (const line of text.split(/\r?\n/)) {
		if (!line.trim()) {
			continue;
		}

		try {
			const row = JSON.parse(line);
			if (row?.url) {
				byUrl[row.url] = row;
			}
		} catch (error) {
			console.log('[lobby_result_fill] ndjson parse failed', String(error));
		}
	}

	return byUrl;
}

function fetchMatchHistories(urls) {
	if (urls.length === 0) {
		return {};
	}

	try {
		const raw = toString(
			$os.cmd('python3', FETCH_SCRIPT, '--ndjson', JSON.stringify(urls)).output()
		);
		return parseNdjson(raw);
	} catch (error) {
		console.log('[lobby_result_fill] fetch failed', String(error));
		return {};
	}
}

/** Coerce PocketBase/goja JSON field values into a plain array. */
function asPlayerList(raw) {
	if (Array.isArray(raw)) {
		return raw;
	}

	if (typeof raw === 'string') {
		if (!raw || raw === '[]' || raw === 'null') {
			return [];
		}
		try {
			return asPlayerList(JSON.parse(raw));
		} catch {
			return [];
		}
	}

	if (raw && typeof raw === 'object') {
		try {
			const serialized = JSON.stringify(raw);
			const parsed = JSON.parse(serialized);
			if (Array.isArray(parsed)) {
				return parsed;
			}
		} catch {
			// fall through
		}

		try {
			const asArray = Array.from(raw);
			if (asArray.length > 0) {
				return asArray;
			}
		} catch {
			// fall through
		}

		const keys = Object.keys(raw);
		if (keys.length > 0 && keys.every((key) => /^\d+$/.test(key))) {
			return keys
				.sort((a, b) => Number(a) - Number(b))
				.map((key) => raw[key]);
		}
	}

	return [];
}

function profileIdFromPlayer(player) {
	if (!player || typeof player !== 'object') {
		return null;
	}

	const candidates = [
		player.profile_id,
		player.profile && player.profile.profile_id,
		player.playerId
	];

	for (const candidate of candidates) {
		const id = Number(candidate);
		if (Number.isFinite(id) && id > 0) {
			return Math.trunc(id);
		}
	}

	return null;
}

function resolveProfileIdFromPlayers(players) {
	for (const player of players) {
		const profileId = profileIdFromPlayer(player);
		if (profileId != null) {
			return profileId;
		}
	}

	return null;
}

function resolveProfileIdFromCsv(record) {
	const csv = String(record.get('playerProfileIdsCsv') || '');
	if (!csv) {
		return null;
	}

	for (const part of csv.split(',')) {
		const id = Number(part);
		if (Number.isFinite(id) && id > 0) {
			return Math.trunc(id);
		}
	}

	return null;
}

function resolveProfileId(record) {
	const fromCsv = resolveProfileIdFromCsv(record);
	if (fromCsv != null) {
		return fromCsv;
	}

	const fromPlayers = resolveProfileIdFromPlayers(asPlayerList(record.get('players')));
	if (fromPlayers != null) {
		return fromPlayers;
	}

	return resolveProfileIdFromPlayers(asPlayerList(record.get('lobbyPlayers')));
}

function selectPendingLobbies() {
	// Prefer fewest attempts, then newest — Relic only keeps recent history,
	// so oldest-first never fills and starves matches that are still available.
	return $app.findRecordsByFilter(
		COLLECTION,
		'needsResult = true && hasFailed != true && (resultAttempts < {:max} || resultAttempts = null)',
		'resultAttempts, -createdAt',
		BATCH_SIZE,
		0,
		{ max: MAX_ATTEMPTS }
	);
}

function bumpAttempt(record) {
	const current = Number(record.get('resultAttempts')) || 0;
	const next = current + 1;
	record.set('resultAttempts', next);
	if (next >= MAX_ATTEMPTS) {
		record.set('hasFailed', true);
	}
	$app.save(record);
}

function markFilled(record, result) {
	record.set('result', result);
	record.set('needsResult', false);
	record.set('hasFailed', false);
	$app.save(record);
}

function runBatch() {
	const pending = selectPendingLobbies();
	if (!pending.length) {
		return { pending: 0, filled: 0, failed: 0, bumped: 0, fetched: 0 };
	}

	const byProfile = {};
	const noProfile = [];
	const profileOrder = [];

	for (const record of pending) {
		const profileId = resolveProfileId(record);
		if (profileId == null) {
			noProfile.push(record);
			continue;
		}

		if (!byProfile[profileId]) {
			byProfile[profileId] = [];
			profileOrder.push(profileId);
		}
		byProfile[profileId].push(record);
	}

	let failed = 0;
	let bumped = 0;

	// Missing profile id: count as an attempt (no instant hasFailed).
	for (const record of noProfile) {
		try {
			console.log('[lobby_result_fill] no profileId for lobby', record.id);
			bumpAttempt(record);
			bumped += 1;
			if (record.get('hasFailed')) {
				failed += 1;
			}
		} catch (error) {
			console.log('[lobby_result_fill] bumpAttempt failed', record.id, String(error));
		}
	}

	const fetchProfileIds = profileOrder.slice(0, MAX_PROFILE_FETCHES);
	const urls = fetchProfileIds.map(matchHistoryUrl);
	const payloads = fetchMatchHistories(urls);

	let filled = 0;
	let fetched = 0;

	for (const profileId of fetchProfileIds) {
		const url = matchHistoryUrl(profileId);
		const payload = payloads[url];
		fetched += 1;

		let matches = [];
		if (payload?.ok && payload.body) {
			try {
				matches = matchHistory.transformMatchHistory(payload.body, profileId);
			} catch (error) {
				console.log('[lobby_result_fill] transform failed', profileId, String(error));
				matches = [];
			}
		} else if (payload && !payload.ok) {
			console.log('[lobby_result_fill] relic fetch not ok', profileId, payload.error || '');
		}

		const bySessionId = {};
		for (const match of matches) {
			const id = Number(match?.id);
			if (Number.isFinite(id) && id > 0) {
				bySessionId[Math.trunc(id)] = match;
			}
		}

		for (const record of byProfile[profileId] || []) {
			const sessionId = Math.trunc(Number(record.get('sessionId')));
			const result = bySessionId[sessionId];

			try {
				if (result) {
					markFilled(record, result);
					filled += 1;
				} else {
					bumpAttempt(record);
					bumped += 1;
					if (record.get('hasFailed')) {
						failed += 1;
					}
				}
			} catch (error) {
				console.log('[lobby_result_fill] update failed', record.id, String(error));
			}
		}
	}

	return {
		pending: pending.length,
		filled,
		failed,
		bumped,
		fetched
	};
}

module.exports = {
	BATCH_SIZE,
	MAX_ATTEMPTS,
	MAX_PROFILE_FETCHES,
	runBatch
};
