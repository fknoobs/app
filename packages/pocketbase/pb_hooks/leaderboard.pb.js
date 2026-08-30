/// <reference path="../pb_data/types.d.ts" />

'use strict';

routerAdd('OPTIONS', '/api/leaderboard/{id}', (e) => {
	return require(`${__hooks}/lib/leaderboard.js`).handleOptions(e);
});

routerAdd('GET', '/api/leaderboard/{id}', (e) => {
	return require(`${__hooks}/lib/leaderboard.js`).handleGet(e);
});

$app.onServe().bindFunc((e) => {
	e.next();

	cronAdd('leaderboard_cache_refresh', '* * * * *', () => {
		const lib = require(`${__hooks}/lib/leaderboard.js`);
		const results = lib.refreshNextBoards(2);
		console.log(`[leaderboard] cache refresh ${JSON.stringify(results)}`);
	});
});
