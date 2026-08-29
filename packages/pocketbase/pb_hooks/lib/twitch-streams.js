'use strict';

const DEFAULT_CLIENT_ID = 'kp4erttmb696osn4inqrlg6qmv5eaq';
const COH1_FALLBACK_GAME_IDS = ['17343', '4359', '22080', '789122137'];
const COH1_GAME_NAMES = [
	'Company of Heroes',
	'Company of Heroes: Opposing Fronts',
	'Company of Heroes: Tales of Valor',
	'Company of Heroes: Definitive Edition'
];
const STREAM_CACHE_MS = 60_000;
const EMPTY_CACHE_MS = 15_000;
const TOKEN_MARGIN_MS = 3_600_000;

let tokenCache = { accessToken: '', expiresAt: 0 };
let gameIdsCache = null;
let streamsCache = { items: [], expiresAt: 0 };

function clientId() {
	return $os.getenv('TWITCH_CLIENT_ID') || DEFAULT_CLIENT_ID;
}

function clientSecret() {
	return $os.getenv('TWITCH_CLIENT_SECRET') || '';
}

function nowMs() {
	return Number(new Date());
}

function isAllowedGameName(name) {
	const normalized = String(name || '')
		.trim()
		.toLowerCase();
	for (const allowed of COH1_GAME_NAMES) {
		if (allowed.toLowerCase() === normalized) return true;
	}
	return false;
}

function parseJson(response, context) {
	if (!response) {
		throw new Error(`Empty HTTP response (${context})`);
	}
	if (response.statusCode < 200 || response.statusCode >= 300) {
		throw new Error(`Twitch HTTP ${response.statusCode} (${context})`);
	}
	if (response.json != null) {
		return response.json;
	}
	const raw = response.raw || '';
	if (!raw) {
		throw new Error(`Empty HTTP body (${context})`);
	}
	return JSON.parse(raw);
}

function helixGet(path, accessToken) {
	return $http.send({
		url: `https://api.twitch.tv${path}`,
		method: 'GET',
		headers: {
			'Client-Id': clientId(),
			Authorization: `Bearer ${accessToken}`
		},
		timeout: 15
	});
}

function getAppAccessToken() {
	if (tokenCache.accessToken && tokenCache.expiresAt > nowMs()) {
		return tokenCache.accessToken;
	}
	const secret = clientSecret();
	if (!secret) {
		throw new Error('TWITCH_CLIENT_SECRET is not configured');
	}
	const body =
		`client_id=${encodeURIComponent(clientId())}` +
		`&client_secret=${encodeURIComponent(secret)}` +
		'&grant_type=client_credentials';
	const response = $http.send({
		url: 'https://id.twitch.tv/oauth2/token',
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body,
		timeout: 15
	});
	const data = parseJson(response, 'oauth token');
	const accessToken = data?.access_token;
	const expiresIn = Number(data?.expires_in) || 0;
	if (!accessToken) {
		throw new Error('Twitch token response missing access_token');
	}
	tokenCache = {
		accessToken,
		expiresAt: nowMs() + Math.max(60_000, expiresIn * 1000 - TOKEN_MARGIN_MS)
	};
	return accessToken;
}

function addGameId(ids, id, name) {
	const gameId = String(id || '');
	if (!gameId || !isAllowedGameName(name) || ids.includes(gameId)) return;
	ids.push(gameId);
}

function resolveGameIds(accessToken) {
	if (gameIdsCache?.length) {
		return gameIdsCache;
	}
	const ids = COH1_FALLBACK_GAME_IDS.slice();
	const nameParams = COH1_GAME_NAMES.map((name) => `name=${encodeURIComponent(name)}`).join('&');
	try {
		const data = parseJson(helixGet(`/helix/games?${nameParams}`, accessToken), 'games');
		for (const game of data?.data || []) {
			addGameId(ids, game?.id, game?.name);
		}
	} catch (error) {
		console.warn('[twitch_streams] name lookup failed:', String(error?.message || error));
	}
	try {
		const data = parseJson(
			helixGet(
				`/helix/search/categories?first=20&query=${encodeURIComponent('Company of Heroes')}`,
				accessToken
			),
			'search'
		);
		for (const game of data?.data || []) {
			addGameId(ids, game?.id, game?.name);
		}
	} catch (error) {
		console.warn('[twitch_streams] category search failed:', String(error?.message || error));
	}
	gameIdsCache = ids;
	return ids;
}

function thumbnailUrl(template) {
	return String(template || '').replace('{width}', '440').replace('{height}', '248');
}

function mapStream(stream) {
	return {
		id: String(stream?.id || ''),
		userName: String(stream?.user_login || ''),
		userDisplayName: String(stream?.user_name || ''),
		title: String(stream?.title || ''),
		gameName: String(stream?.game_name || ''),
		viewers: Number(stream?.viewer_count) || 0,
		thumbnailUrl: thumbnailUrl(stream?.thumbnail_url)
	};
}

function fetchStreamsForGame(accessToken, gameId) {
	const data = parseJson(
		helixGet(`/helix/streams?first=50&game_id=${encodeURIComponent(gameId)}`, accessToken),
		'streams'
	);
	return data?.data || [];
}

function listLiveStreams() {
	if (streamsCache.expiresAt > nowMs()) {
		return streamsCache.items;
	}
	const accessToken = getAppAccessToken();
	const gameIds = resolveGameIds(accessToken);
	const byId = {};
	for (const gameId of gameIds) {
		for (const stream of fetchStreamsForGame(accessToken, gameId)) {
			if (!isAllowedGameName(stream?.game_name)) continue;
			const mapped = mapStream(stream);
			if (!mapped.id || !mapped.userName) continue;
			byId[mapped.id] = mapped;
		}
	}
	const items = Object.values(byId).sort((a, b) => b.viewers - a.viewers);
	streamsCache = {
		items,
		expiresAt: nowMs() + (items.length ? STREAM_CACHE_MS : EMPTY_CACHE_MS)
	};
	console.log(`[twitch_streams] games=${gameIds.join(',')} items=${items.length}`);
	return items;
}

module.exports = {
	listLiveStreams
};
