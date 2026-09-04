/// <reference path="../pb_data/types.d.ts" />

'use strict';

routerAdd('OPTIONS', '/api/dev/live-lobbies/seed', (e) => {
	return require(`${__hooks}/lib/live-lobbies-dev.js`).handleOptions(e);
});

routerAdd('POST', '/api/dev/live-lobbies/seed', (e) => {
	return require(`${__hooks}/lib/live-lobbies-dev.js`).handleSeed(e);
});

routerAdd('DELETE', '/api/dev/live-lobbies/seed', (e) => {
	return require(`${__hooks}/lib/live-lobbies-dev.js`).handleClear(e);
});
