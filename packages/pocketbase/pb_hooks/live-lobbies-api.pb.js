/// <reference path="../pb_data/types.d.ts" />

'use strict';

routerAdd('OPTIONS', '/api/live-lobbies', (e) => {
	return require(`${__hooks}/lib/live-lobbies.js`).handleOptions(e);
});

routerAdd('OPTIONS', '/api/live-lobbies/{id}', (e) => {
	return require(`${__hooks}/lib/live-lobbies.js`).handleOptions(e);
});

routerAdd('GET', '/api/live-lobbies', (e) => {
	return require(`${__hooks}/lib/live-lobbies.js`).handleList(e);
});

routerAdd('GET', '/api/live-lobbies/{id}', (e) => {
	return require(`${__hooks}/lib/live-lobbies.js`).handleGet(e);
});
