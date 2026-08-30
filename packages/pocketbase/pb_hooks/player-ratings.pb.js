/// <reference path="../pb_data/types.d.ts" />

'use strict';

$app.onServe().bindFunc((e) => {
	e.next();

	cronAdd('player_ratings_backfill', '1-59/5 * * * *', () => {
		const backfill = require(`${__hooks}/lib/player-ratings-backfill.js`);
		if (backfill.isComplete()) {
			return;
		}

		const result = backfill.runBatch();
		console.log(
			`[player_ratings] backfill batch processed=${result.processed} updated=${result.updated} complete=${result.complete}`
		);
	});

	cronAdd('player_ratings_leaderboard_harvest', '2-59/5 * * * *', () => {
		const lbHarvest = require(`${__hooks}/lib/player-ratings-leaderboard-harvest.js`);
		const result = lbHarvest.runBatch();
		console.log(
			`[player_ratings] leaderboard harvest leaderboardId=${result.leaderboardId} profiles=${result.profileIds} next=${result.nextLeaderboardId} harvest=${JSON.stringify(result.harvest)} error=${result.error || ''}`
		);
	});

	cronAdd('player_ratings_harvest', '3-59/5 * * * *', () => {
		const harvest = require(`${__hooks}/lib/player-ratings-harvest.js`);
		const result = harvest.runBatch();
		console.log(
			`[player_ratings] harvest processed=${result.processed} fetched=${result.fetched} updated=${result.updated} failed=${result.failed} snowball=${JSON.stringify(result.snowball)}`
		);
	});

	cronAdd('player_ratings_lobby_fill', '4-59/5 * * * *', () => {
		const ratings = require(`${__hooks}/lib/player-ratings.js`);
		const result = ratings.runLobbyFillBatch();
		console.log(
			`[player_ratings] lobby fill players=${result.players} processed=${result.processed} updated=${result.updated}`
		);
	});
});

routerAdd('POST', '/api/player-ratings/backfill/run', (e) => {
	const ratings = require(`${__hooks}/lib/player-ratings.js`);
	if (!ratings.isServiceRequest(e) && !e.hasSuperuserAuth()) {
		return e.json(401, { message: 'Unauthorized' });
	}

	const backfill = require(`${__hooks}/lib/player-ratings-backfill.js`);
	const reset = e.request.url.query().get('reset') === 'true';
	if (reset) {
		backfill.reset();
	}

	const result = backfill.runBatch();

	return e.json(200, {
		...result,
		page: backfill.getPage(),
		complete: backfill.isComplete()
	});
});

routerAdd('POST', '/api/player-ratings/harvest/run', (e) => {
	const ratings = require(`${__hooks}/lib/player-ratings.js`);
	if (!ratings.isServiceRequest(e) && !e.hasSuperuserAuth()) {
		return e.json(401, { message: 'Unauthorized' });
	}

	const harvest = require(`${__hooks}/lib/player-ratings-harvest.js`);
	return e.json(200, harvest.runBatch());
});

routerAdd('POST', '/api/player-ratings/harvest/profiles', (e) => {
	return require(`${__hooks}/lib/player-ratings-harvest.js`).handleHarvestProfiles(e);
});

routerAdd('POST', '/api/player-ratings/harvest/leaderboards', (e) => {
	return require(`${__hooks}/lib/player-ratings-leaderboard-harvest.js`).handleHarvestLeaderboards(
		e
	);
});

routerAdd('POST', '/api/player-ratings/fill-from-lobbies', (e) => {
	return require(`${__hooks}/lib/player-ratings.js`).handleFillFromLobbies(e);
});

routerAdd('POST', '/api/player-ratings/ingest', (e) => {
	return require(`${__hooks}/lib/player-ratings.js`).handleIngest(e);
});

routerAdd('GET', '/api/player-ratings/history', (e) => {
	return require(`${__hooks}/lib/player-ratings.js`).handleEloHistory(e);
});

routerAdd('GET', '/api/player-ratings/{steamId}', (e) => {
	return require(`${__hooks}/lib/player-ratings.js`).handleGetBySteamId(e);
});

onRecordAfterCreateSuccess((e) => {
	require(`${__hooks}/lib/player-ratings.js`).ingestLobbyRecord(e);
}, 'lobbies');

onRecordAfterUpdateSuccess((e) => {
	require(`${__hooks}/lib/player-ratings.js`).ingestLobbyRecord(e);
}, 'lobbies');
