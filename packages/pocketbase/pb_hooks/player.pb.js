/// <reference path="../pb_data/types.d.ts" />

'use strict';

routerAdd('OPTIONS', '/api/player/search', (e) => {
	return require(`${__hooks}/lib/player-search.js`).handleOptions(e);
});

routerAdd('GET', '/api/player/search', (e) => {
	return require(`${__hooks}/lib/player-search.js`).handleSearch(e);
});

routerAdd('OPTIONS', '/api/player/{id}', (e) => {
	return require(`${__hooks}/lib/player.js`).handleOptions(e);
});

routerAdd('GET', '/api/player/{id}', (e) => {
	return require(`${__hooks}/lib/player.js`).handleGet(e);
});
