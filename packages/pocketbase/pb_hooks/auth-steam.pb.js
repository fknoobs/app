/// <reference path="../pb_data/types.d.ts" />

'use strict';

routerAdd('GET', '/api/auth/steam/start', (e) => {
	return require(`${__hooks}/lib/auth-steam.js`).handleStart(e);
});

routerAdd('GET', '/api/auth/steam/callback', (e) => {
	return require(`${__hooks}/lib/auth-steam.js`).handleCallback(e);
});
