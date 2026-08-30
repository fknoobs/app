// Public Relic ladder for coh1stats.com.
'use strict';

const ratings = require(`${__hooks}/lib/player-ratings.js`);
const playerLabels = require(`${__hooks}/lib/player-labels.js`);

const RELIC_API_BASE = 'https://coh1-lobby.reliclink.com';
const RANKED_LEADERBOARD_MIN = 4;
const RANKED_LEADERBOARD_MAX = 19;
const ELO_BATCH_SIZE = 40;
const CACHE_TTL_MS = 60 * 1000;

const ALLOWED_ORIGINS = [
	'https://coh1stats.com',
	'https://www.coh1stats.com',
	'http://localhost:5174',
	'http://127.0.0.1:5174'
];

const cache = {};

function isRankedLeaderboard(leaderboardId) {
	return leaderboardId >= RANKED_LEADERBOARD_MIN && leaderboardId <= RANKED_LEADERBOARD_MAX;
}

function steamIdFromName(name) {
	if (typeof name !== 'string') {
		return '';
	}
	return name.replace('/steam/', '');
}

function logInfo(message, attrs) {
	const pairs = ['source', 'leaderboard'];
	appendLogAttrs(pairs, attrs);
	$app.logger().info(message, ...pairs);
}

function logWarn(message, attrs) {
	const pairs = ['source', 'leaderboard'];
	appendLogAttrs(pairs, attrs);
	$app.logger().warn(message, ...pairs);
}

function logError(message, attrs) {
	const pairs = ['source', 'leaderboard'];
	appendLogAttrs(pairs, attrs);
	$app.logger().error(message, ...pairs);
}

function appendLogAttrs(pairs, attrs) {
	if (!attrs) {
		return;
	}
	for (const key in attrs) {
		if (!Object.prototype.hasOwnProperty.call(attrs, key)) {
			continue;
		}
		const value = attrs[key];
		if (value == null) {
			continue;
		}
		pairs.push(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
	}
}

function applyCors(e) {
	const origin = e.request.header.get('Origin');
	if (origin && ALLOWED_ORIGINS.includes(origin)) {
		e.response.header().set('Access-Control-Allow-Origin', origin);
		e.response.header().set('Vary', 'Origin');
	}
	e.response.header().set('Access-Control-Allow-Methods', 'GET, OPTIONS');
	e.response.header().set('Access-Control-Allow-Headers', 'Content-Type');
}

function jsonWithCors(e, status, body) {
	applyCors(e);
	return e.json(status, body);
}

function fetchRelicJsonInsecure(url, context) {
	try {
		const raw = toString($os.cmd('python3', `${__hooks}/lib/fetch-insecure.py`, url).output());
		if (!raw) {
			throw new Error('Empty HTTP body');
		}
		return JSON.parse(raw);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logError('Leaderboard Relic fetch failed', {
			upstream: 'relic',
			...context,
			error: message
		});
		throw new Error(`Relic fetch failed: ${message}`);
	}
}

function readCache(leaderboardId) {
	const entry = cache[leaderboardId];
	if (!entry) {
		return null;
	}
	if (Date.now() - entry.at > CACHE_TTL_MS) {
		delete cache[leaderboardId];
		return null;
	}
	return entry.data;
}

function writeCache(leaderboardId, data) {
	cache[leaderboardId] = { at: Date.now(), data };
}

function joinLeaderboard(data) {
	const membersByStatGroupId = {};
	const groups = data?.statGroups ?? [];
	for (const group of groups) {
		const members = group?.members ?? [];
		for (const member of members) {
			membersByStatGroupId[member.personal_statgroup_id] = member;
		}
	}

	const stats = [];
	for (const stat of data?.leaderboardStats ?? []) {
		const member = membersByStatGroupId[stat.statgroup_id];
		if (!member) {
			continue;
		}
		stats.push({
			leaderboard_id: Number(stat.leaderboard_id) || 0,
			rank: Number(stat.rank) || 0,
			ranklevel: Number(stat.ranklevel) || 0,
			wins: Number(stat.wins) || 0,
			losses: Number(stat.losses) || 0,
			streak: Number(stat.streak) || 0,
			profile: {
				profile_id: Number(member.profile_id) || 0,
				alias: member.alias || '',
				country: member.country || null,
				name: member.name || ''
			}
		});
	}
	return stats;
}

function loadEloBySteamIds(steamIds) {
	const eloBySteamId = {};
	const unique = [];
	const seen = {};
	for (const steamId of steamIds) {
		if (!ratings.isValidSteamId(steamId) || seen[steamId]) {
			continue;
		}
		seen[steamId] = true;
		unique.push(steamId);
	}

	for (let i = 0; i < unique.length; i += ELO_BATCH_SIZE) {
		const batch = unique.slice(i, i + ELO_BATCH_SIZE);
		const params = {};
		const filter = batch
			.map((_, index) => {
				params[`id${index}`] = batch[index];
				return `steamId = {:id${index}}`;
			})
			.join(' || ');
		let records = [];
		try {
			records = $app.findRecordsByFilter(
				ratings.COLLECTION,
				filter,
				'',
				batch.length,
				0,
				params
			);
		} catch (error) {
			logWarn('Leaderboard ELO batch failed', { error: String(error) });
			continue;
		}
		for (const record of records) {
			const serialized = ratings.serializeRecord(record);
			if (serialized?.steamId && serialized.elo) {
				eloBySteamId[serialized.steamId] = serialized.elo;
			}
		}
	}

	return eloBySteamId;
}

function fetchSteamAvatars(steamIds) {
	const apiKey = $os.getenv('STEAM_API_KEY') || $os.getenv('PUBLIC_STEAM_API_KEY');
	if (!apiKey || steamIds.length === 0) {
		return {};
	}

	const url =
		'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?' +
		`key=${encodeURIComponent(apiKey)}&steamids=${encodeURIComponent(steamIds.join(','))}`;

	try {
		const response = $http.send({
			url,
			method: 'GET',
			timeout: 15
		});
		const data =
			response?.json != null ? response.json : JSON.parse(response?.raw || '{}');
		const avatars = {};
		for (const player of data?.response?.players ?? []) {
			if (player?.steamid && player.avatarfull) {
				avatars[player.steamid] = player.avatarfull;
			}
		}
		return avatars;
	} catch (error) {
		logWarn('Leaderboard Steam avatars failed', { error: String(error) });
		return {};
	}
}

function loadLeaderboard(leaderboardId) {
	const cached = readCache(leaderboardId);
	if (cached) {
		return cached;
	}

	const url =
		`${RELIC_API_BASE}/community/leaderboard/getleaderboard2?title=coh1&leaderboard_id=` +
		encodeURIComponent(String(leaderboardId));
	const data = fetchRelicJsonInsecure(url, { leaderboardId });
	const stats = joinLeaderboard(data);
	const steamIds = stats.map((stat) => steamIdFromName(stat.profile.name));
	let eloBySteamId = loadEloBySteamIds(steamIds);

	const missingProfileIds = [];
	for (const stat of stats) {
		if (missingProfileIds.length >= 12) {
			break;
		}

		const steamId = steamIdFromName(stat.profile.name);
		const elo = eloBySteamId[steamId];
		if (ratings.getStoredEloForLeaderboard(elo, leaderboardId) == null) {
			const profileId = Number(stat.profile.profile_id);
			if (Number.isInteger(profileId) && profileId > 0) {
				missingProfileIds.push(profileId);
			}
		}
	}

	if (missingProfileIds.length > 0) {
		try {
			const harvest = require(`${__hooks}/lib/player-ratings-harvest.js`);
			const result = harvest.harvestProfiles(missingProfileIds);
			if (result.processed > 0) {
				eloBySteamId = loadEloBySteamIds(steamIds);
			}
		} catch (error) {
			logWarn('Leaderboard ELO harvest failed', { error: String(error), leaderboardId });
		}
	}

	const topSteamIds = stats
		.slice(0, 3)
		.map((stat) => steamIdFromName(stat.profile.name))
		.filter((id) => ratings.isValidSteamId(id));
	const avatars = fetchSteamAvatars(topSteamIds);
	for (let i = 0; i < Math.min(3, stats.length); i++) {
		const steamId = steamIdFromName(stats[i].profile.name);
		const avatarUrl = avatars[steamId];
		if (avatarUrl) {
			stats[i].profile.avatarUrl = avatarUrl;
		}
	}

	const labelsBySteamId = playerLabels.loadLabelsBySteamIds(steamIds);
	for (const stat of stats) {
		const steamId = steamIdFromName(stat.profile.name);
		stat.profile.labels = labelsBySteamId[steamId] ?? [];
	}

	const payload = {
		leaderboardId,
		stats,
		eloBySteamId
	};
	writeCache(leaderboardId, payload);
	return payload;
}

function handleOptions(e) {
	applyCors(e);
	return e.noContent(204);
}

function handleGet(e) {
	const rawId = e.request.pathValue('id');
	const leaderboardId = Number(rawId);
	const origin = e.request.header.get('Origin') || 'none';

	logInfo('Leaderboard request', { leaderboardId: rawId, origin });

	if (!Number.isInteger(leaderboardId) || !isRankedLeaderboard(leaderboardId)) {
		logWarn('Leaderboard invalid id', { id: rawId });
		return jsonWithCors(e, 400, { message: 'leaderboard id must be a ranked Relic id (4-19)' });
	}

	try {
		const cached = Boolean(readCache(leaderboardId));
		const payload = loadLeaderboard(leaderboardId);
		logInfo('Leaderboard loaded', {
			leaderboardId,
			statCount: payload.stats.length,
			cached
		});
		return jsonWithCors(e, 200, payload);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logError('Failed to load leaderboard', { leaderboardId, error: message });
		return jsonWithCors(e, 500, { message: 'Failed to load leaderboard' });
	}
}

module.exports = {
	handleGet,
	handleOptions,
	loadLeaderboard
};
