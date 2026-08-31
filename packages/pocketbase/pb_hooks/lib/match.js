// Public community match (replay) page for coh1stats.com.
'use strict';

const {
	parseLobbyPlayersField,
	parseResultField,
	loadPlayerAliasMap,
	loadPlayersByLobbyIds,
	resolvePlayersForRow
} = require(`${__hooks}/lib/match-history.js`);
const { isHiddenLobby } = require(`${__hooks}/lib/hidden-matches.js`);
const { limitCountRequest, TOO_MANY } = require(`${__hooks}/lib/download-rate-limit.js`);

const HTTP_CACHE_CONTROL = 'public, max-age=30, s-maxage=60, stale-while-revalidate=300';

const ALLOWED_ORIGINS = [
	'https://coh1stats.com',
	'https://www.coh1stats.com',
	'http://localhost:5174',
	'http://127.0.0.1:5174'
];

function applyCors(e) {
	const origin = e.request.header.get('Origin');
	if (origin && ALLOWED_ORIGINS.includes(origin)) {
		e.response.header().set('Access-Control-Allow-Origin', origin);
		e.response.header().set('Vary', 'Origin');
	}
	e.response.header().set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	e.response.header().set('Access-Control-Allow-Headers', 'Content-Type, X-Download-Visitor');
}

function jsonWithCors(e, status, body) {
	applyCors(e);
	if (status === 200) {
		e.response.header().set('Cache-Control', HTTP_CACHE_CONTROL);
	} else {
		e.response.header().set('Cache-Control', 'no-store');
	}
	return e.json(status, body);
}

function jsonNoStore(e, status, body) {
	applyCors(e);
	e.response.header().set('Cache-Control', 'no-store');
	return e.json(status, body);
}

function hasReplayFile(record) {
	const replay = record.get('replay');
	return !!record.get('hasReplay') || (typeof replay === 'string' && replay.length > 0);
}

function durationFromRecord(record, result) {
	const stored = Number(record.get('durationSeconds'));
	if (Number.isFinite(stored) && stored > 0) {
		return stored;
	}
	const start = Number(result?.startgametime);
	const end = Number(result?.completiontime);
	if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
		return end - start;
	}
	return null;
}

function loadMatchPage(id) {
	let record;
	try {
		record = $app.findRecordById('lobbies', id);
	} catch {
		const error = new Error('Match not found');
		error.status = 404;
		throw error;
	}

	if (!hasReplayFile(record) || isHiddenLobby(record)) {
		const error = new Error('Match not found');
		error.status = 404;
		throw error;
	}

	const result = parseResultField(record.get('result'));
	const lobbyPlayers = record.get('lobbyPlayers');
	const row = {
		id: record.id,
		lobbyPlayers: typeof lobbyPlayers === 'string' ? lobbyPlayers : JSON.stringify(lobbyPlayers || []),
		playerProfileIdsCsv: record.get('playerProfileIdsCsv') || '',
		result: record.get('result')
	};
	const aliasMap = loadPlayerAliasMap('community', '');
	const playersByLobby = loadPlayersByLobbyIds([record.id], aliasMap);
	const players = resolvePlayersForRow(row, aliasMap, playersByLobby);

	return {
		id: record.id,
		map: record.get('map') || '',
		title: record.get('title') || '',
		isRanked: !!record.get('isRanked'),
		createdAt: record.get('createdAt') || '',
		durationSeconds: durationFromRecord(record, result),
		likeCount: Number(record.get('likeCount')) || 0,
		downloadCount: Number(record.get('downloadCount')) || 0,
		replay: record.get('replay') || '',
		players,
		result
	};
}

function handleOptions(e) {
	applyCors(e);
	return e.noContent(204);
}

function handleGet(e) {
	const id = e.request.pathValue('id');
	if (!id) {
		return jsonWithCors(e, 400, { message: 'id is required' });
	}

	try {
		return jsonWithCors(e, 200, loadMatchPage(id));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const status = error?.status || 500;
		if (status === 404) {
			return jsonWithCors(e, 404, { message: 'Match not found' });
		}
		console.warn('[match] failed to load', id, message);
		return jsonWithCors(e, 500, { message: 'Failed to load match' });
	}
}

function isIp(value) {
	return typeof value === 'string' && value.length > 0 && value.length <= 45 && /^[0-9a-fA-F.:]+$/.test(value);
}

function clientIp(e) {
	const cf = String(e.request.header.get('CF-Connecting-IP') || '').trim();
	if (isIp(cf)) return cf;
	try {
		if (typeof e.realIP === 'function') {
			const ip = String(e.realIP() || '').trim();
			if (isIp(ip)) return ip;
		}
	} catch {
		// fall through
	}
	return '';
}

function visitorIdFromRequest(e) {
	const header = String(e.request.header.get('X-Download-Visitor') || '').trim();
	if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(header)) {
		return header.toLowerCase();
	}
	return '';
}

function hashFingerprint(kind, value) {
	return String($security.sha256(`${kind}:${value}`) || '').toLowerCase();
}

function fingerprintsForRequest(e) {
	const fingerprints = [];
	const ip = clientIp(e);
	if (ip) fingerprints.push(hashFingerprint('ip', ip));
	const visitorId = visitorIdFromRequest(e);
	if (visitorId) fingerprints.push(hashFingerprint('vid', visitorId));
	return fingerprints;
}

function fingerprintExists(lobbyId, fingerprint) {
	try {
		$app.findFirstRecordByFilter(
			'lobby_download_fingerprints',
			'lobby = {:lobby} && fingerprint = {:fingerprint}',
			{ lobby: lobbyId, fingerprint }
		);
		return true;
	} catch {
		return false;
	}
}

function saveFingerprints(lobbyId, fingerprints) {
	const collection = $app.findCollectionByNameOrId('lobby_download_fingerprints');
	let saved = 0;
	for (const fingerprint of fingerprints) {
		try {
			const record = new Record(collection);
			record.set('lobby', lobbyId);
			record.set('fingerprint', fingerprint);
			$app.save(record);
			saved += 1;
		} catch {
			// Unique index — another request stored this fingerprint first.
		}
	}
	return saved;
}

function currentDownloadCount(id) {
	const lobby = $app.findRecordById('lobbies', id);
	return Number(lobby.get('downloadCount')) || 0;
}

function handleDownload(e) {
	const limited = limitCountRequest(e);
	if (!limited.ok) {
		e.response.header().set('Retry-After', String(limited.retryAfter || 1));
		return jsonNoStore(e, 429, { message: TOO_MANY, retryAfter: limited.retryAfter || 1 });
	}
	const id = e.request.pathValue('id');
	if (!id) {
		return jsonNoStore(e, 400, { message: 'id is required' });
	}

	try {
		loadMatchPage(id);
	} catch (error) {
		const status = error?.status || 500;
		if (status === 404) {
			return jsonNoStore(e, 404, { message: 'Match not found' });
		}
		console.warn('[match] failed to record download', id, String(error?.message || error));
		return jsonNoStore(e, 500, { message: 'Failed to record download' });
	}

	try {
		const fingerprints = fingerprintsForRequest(e);
		const count = currentDownloadCount(id);
		if (!fingerprints.length) {
			return jsonNoStore(e, 200, { downloadCount: count, counted: false });
		}
		if (fingerprints.some((fingerprint) => fingerprintExists(id, fingerprint))) {
			return jsonNoStore(e, 200, { downloadCount: count, counted: false });
		}
		if (!saveFingerprints(id, fingerprints)) {
			return jsonNoStore(e, 200, { downloadCount: currentDownloadCount(id), counted: false });
		}
		const lobby = $app.findRecordById('lobbies', id);
		const next = (Number(lobby.get('downloadCount')) || 0) + 1;
		lobby.set('downloadCount', next);
		$app.save(lobby);
		return jsonNoStore(e, 200, { downloadCount: next, counted: true });
	} catch (error) {
		console.warn('[match] failed to save download count', id, String(error?.message || error));
		return jsonNoStore(e, 500, { message: 'Failed to record download' });
	}
}

module.exports = {
	handleGet,
	handleDownload,
	handleOptions,
	loadMatchPage
};
