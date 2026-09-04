// Public Relic player name search for coh1stats.com.
'use strict';

const RELIC_API_BASE = 'https://coh1-lobby.reliclink.com';
const STEAM_ID_REGEX = /^7656119\d{10}$/;
const MAX_QUERY_LENGTH = 64;
const MAX_RESULTS = 20;
const HTTP_CACHE_CONTROL = 'public, max-age=15, s-maxage=30, stale-while-revalidate=60';

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

function fetchRelicJsonInsecure(url) {
	const raw = toString($os.cmd('python3', `${__hooks}/lib/fetch-insecure.py`, url).output());
	if (!raw) {
		throw new Error('Empty HTTP body');
	}
	return JSON.parse(raw);
}

function relicSearchUrl(query) {
	return `${RELIC_API_BASE}/community/leaderboard/getpersonalstat?title=coh1&search=${encodeURIComponent(query)}`;
}

function relicAliasUrl(alias) {
	return (
		`${RELIC_API_BASE}/community/leaderboard/getpersonalstat?title=coh1&aliases=` +
		encodeURIComponent(JSON.stringify([alias]))
	);
}

function steamIdFromName(name) {
	if (typeof name !== 'string') {
		return '';
	}
	return name.replace('/steam/', '');
}

function extractMembers(statGroups) {
	const seen = {};
	const members = [];
	for (const group of statGroups || []) {
		for (const member of group.members || []) {
			const profileId = Number(member?.profile_id);
			if (!profileId || seen[profileId]) {
				continue;
			}
			seen[profileId] = true;
			members.push(member);
		}
	}
	return members;
}

function steamApiKey() {
	return $os.getenv('STEAM_API_KEY') || $os.getenv('PUBLIC_STEAM_API_KEY') || '';
}

function fetchSteamAvatars(steamIds) {
	const apiKey = steamApiKey();
	const avatars = {};
	if (!apiKey || steamIds.length === 0) {
		return avatars;
	}
	const ids = steamIds.filter((id) => STEAM_ID_REGEX.test(id)).slice(0, 100);
	if (ids.length === 0) {
		return avatars;
	}
	try {
		const response = $http.send({
			url:
				'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?' +
				`key=${encodeURIComponent(apiKey)}&steamids=${encodeURIComponent(ids.join(','))}`,
			method: 'GET',
			timeout: 15
		});
		const data = response?.json ?? JSON.parse(response?.raw || '{}');
		for (const player of data?.response?.players || []) {
			if (player?.steamid) {
				avatars[player.steamid] = player.avatarfull || player.avatarmedium || player.avatar || '';
			}
		}
	} catch (error) {
		console.warn('[player_search] steam summaries failed:', String(error?.message || error));
	}
	return avatars;
}

function mapMember(member, avatars) {
	const steamId = steamIdFromName(member?.name);
	return {
		profileId: Number(member?.profile_id) || 0,
		alias: String(member?.alias || ''),
		country: member?.country ? String(member.country) : null,
		level: Number(member?.level) || 0,
		steamId,
		avatarUrl: avatars[steamId] || ''
	};
}

function searchProfiles(query) {
	const data = fetchRelicJsonInsecure(relicSearchUrl(query));
	if (data?.result?.code === 10) {
		const exact = fetchRelicJsonInsecure(relicAliasUrl(query));
		const members = extractMembers(exact?.statGroups).filter(
			(member) => String(member?.alias || '').toLowerCase() === query.toLowerCase()
		);
		const fallback = members.length > 0 ? members : extractMembers(exact?.statGroups).slice(0, 1);
		return fallback.slice(0, MAX_RESULTS);
	}
	return extractMembers(data?.statGroups).slice(0, MAX_RESULTS);
}

function handleOptions(e) {
	applyCors(e);
	return e.noContent(204);
}

function handleSearch(e) {
	const query = String(e.request.url.query().get('q') || '').trim();
	if (!query) {
		return jsonWithCors(e, 400, { message: 'q is required' });
	}
	if (query.length > MAX_QUERY_LENGTH) {
		return jsonWithCors(e, 400, { message: 'q is too long' });
	}

	try {
		const members = searchProfiles(query);
		const steamIds = members.map((member) => steamIdFromName(member?.name)).filter(Boolean);
		const avatars = fetchSteamAvatars(steamIds);
		const items = members
			.map((member) => mapMember(member, avatars))
			.filter((item) => item.profileId > 0);
		const likeCounts = require(`${__hooks}/lib/player-social.js`).loadLikeCountsBySteamIds(
			items.map((item) => item.steamId).filter(Boolean)
		);
		require(`${__hooks}/lib/player-social.js`).attachLikeCountsToPlayers(items, likeCounts);
		return jsonWithCors(e, 200, { items }, HTTP_CACHE_CONTROL);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn('[player_search] failed:', message);
		return jsonWithCors(e, 502, { message: 'Failed to search for player' });
	}
}

module.exports = {
	handleOptions,
	handleSearch
};
