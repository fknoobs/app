'use strict';

const ratings = require(`${__hooks}/lib/player-ratings.js`);
const harvest = require(`${__hooks}/lib/player-ratings-harvest.js`);
const jobState = require(`${__hooks}/lib/job-state.js`);

const RELIC_API_BASE = 'https://coh1-lobby.reliclink.com';
const RANKED_LEADERBOARD_MIN = 4;
const RANKED_LEADERBOARD_MAX = 19;
const PROFILE_LIMIT = 12;
const JOB_ID = 'player_ratings_leaderboard_harvest';
const FETCH_SCRIPT = `${__hooks}/lib/fetch-insecure.py`;

function isRankedLeaderboard(leaderboardId) {
	return (
		Number.isInteger(leaderboardId) &&
		leaderboardId >= RANKED_LEADERBOARD_MIN &&
		leaderboardId <= RANKED_LEADERBOARD_MAX
	);
}

function getNextLeaderboardId() {
	const page = jobState.getPage(JOB_ID);
	if (isRankedLeaderboard(page)) {
		return page;
	}

	return RANKED_LEADERBOARD_MIN;
}

function advanceCursor(current) {
	const next =
		current >= RANKED_LEADERBOARD_MAX ? RANKED_LEADERBOARD_MIN : current + 1;
	jobState.setPage(JOB_ID, next);
	return next;
}

function fetchRelicJson(url) {
	const raw = toString($os.cmd('python3', FETCH_SCRIPT, url).output());
	if (!raw) {
		throw new Error('Empty HTTP body');
	}

	return JSON.parse(raw);
}

function joinLeaderboardProfileIds(data) {
	const membersByStatGroupId = {};
	for (const group of data?.statGroups ?? []) {
		for (const member of group?.members ?? []) {
			membersByStatGroupId[member.personal_statgroup_id] = member;
		}
	}

	const profileIds = [];
	const seen = {};

	const stats = Array.isArray(data?.leaderboardStats)
		? data.leaderboardStats.slice()
		: [];
	stats.sort((a, b) => (Number(a.rank) || 0) - (Number(b.rank) || 0));

	for (const stat of stats) {
		const member = membersByStatGroupId[stat.statgroup_id];
		const profileId = Number(member?.profile_id);
		if (!Number.isInteger(profileId) || profileId <= 0 || seen[profileId]) {
			continue;
		}

		seen[profileId] = true;
		profileIds.push(profileId);

		if (profileIds.length >= PROFILE_LIMIT) {
			break;
		}
	}

	return profileIds;
}

function fetchLeaderboardData(leaderboardId) {
	const url =
		`${RELIC_API_BASE}/community/leaderboard/getleaderboard2?title=coh1&leaderboard_id=` +
		encodeURIComponent(String(leaderboardId)) +
		'&count=200';
	return fetchRelicJson(url);
}

function warmPublicCache(leaderboardId, relicData) {
	try {
		const leaderboard = require(`${__hooks}/lib/leaderboard.js`);
		leaderboard.cacheFromRelicData(leaderboardId, relicData);
	} catch (error) {
		console.log(
			'[player_ratings] leaderboard cache warm failed',
			leaderboardId,
			String(error)
		);
	}
}

function runForLeaderboard(leaderboardId) {
	if (!isRankedLeaderboard(leaderboardId)) {
		return {
			leaderboardId,
			profileIds: 0,
			error: 'leaderboardId must be ranked Relic id (4-19)',
			harvest: null
		};
	}

	try {
		const relicData = fetchLeaderboardData(leaderboardId);
		warmPublicCache(leaderboardId, relicData);
		const profileIds = joinLeaderboardProfileIds(relicData);
		const result = harvest.harvestProfiles(profileIds);
		return {
			leaderboardId,
			profileIds: profileIds.length,
			error: null,
			harvest: result
		};
	} catch (error) {
		console.log(
			'[player_ratings] leaderboard harvest failed',
			leaderboardId,
			String(error)
		);
		return {
			leaderboardId,
			profileIds: 0,
			error: String(error),
			harvest: null
		};
	}
}

/**
 * One ranked ladder per tick: fetch Relic leaderboard, harvest match-history
 * ELO for the top PROFILE_LIMIT players, advance cursor.
 */
function runBatch() {
	const leaderboardId = getNextLeaderboardId();
	const result = runForLeaderboard(leaderboardId);
	const nextLeaderboardId = advanceCursor(leaderboardId);

	return {
		...result,
		nextLeaderboardId
	};
}

function handleHarvestLeaderboards(e) {
	if (!ratings.isServiceRequest(e) && !e.hasSuperuserAuth()) {
		return e.json(401, { message: 'Unauthorized' });
	}

	const rawId = e.request.url.query().get('leaderboardId');
	if (rawId) {
		const leaderboardId = Number(rawId);
		if (!isRankedLeaderboard(leaderboardId)) {
			return e.json(400, {
				message: 'leaderboardId must be a ranked Relic id (4-19)'
			});
		}

		return e.json(200, runForLeaderboard(leaderboardId));
	}

	return e.json(200, runBatch());
}

module.exports = {
	RANKED_LEADERBOARD_MIN,
	RANKED_LEADERBOARD_MAX,
	PROFILE_LIMIT,
	JOB_ID,
	runBatch,
	runForLeaderboard,
	handleHarvestLeaderboards,
	getNextLeaderboardId
};
