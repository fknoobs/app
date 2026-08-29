/// <reference path="../pb_data/types.d.ts" />

'use strict';

routerAdd('OPTIONS', '/api/leaderboard/{id}', (e) => {
	return require(`${__hooks}/lib/leaderboard.js`).handleOptions(e);
});

routerAdd('GET', '/api/leaderboard/{id}', (e) => {
	return require(`${__hooks}/lib/leaderboard.js`).handleGet(e);
});
