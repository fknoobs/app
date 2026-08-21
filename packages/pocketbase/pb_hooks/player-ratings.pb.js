/// <reference path="../pb_data/types.d.ts" />

'use strict';

$app.onServe().bindFunc((e) => {
	e.next();

	cronAdd('player_ratings_backfill', '*/5 * * * *', () => {
		const backfill = require(`${__hooks}/lib/player-ratings-backfill.js`);
		if (backfill.isComplete()) {
			return;
		}

		const result = backfill.runBatch();
		console.log(
			`[player_ratings] backfill batch processed=${result.processed} updated=${result.updated} complete=${result.complete}`
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

routerAdd('POST', '/api/player-ratings/ingest', (e) => {
	return require(`${__hooks}/lib/player-ratings.js`).handleIngest(e);
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
