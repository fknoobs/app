/// <reference path="../pb_data/types.d.ts" />

'use strict';

routerAdd('GET', '/api/twitch/streams', (e) => {
	try {
		const items = require(`${__hooks}/lib/twitch-streams.js`).listLiveStreams();
		return e.json(200, { items });
	} catch (error) {
		const message = String(error?.message || error);
		if (message.includes('TWITCH_CLIENT_SECRET')) {
			console.warn('[twitch_streams] missing TWITCH_CLIENT_SECRET');
			return e.json(503, { message: 'Twitch streams are not configured' });
		}
		console.warn('[twitch_streams] fetch failed:', message);
		return e.json(502, { message: 'Failed to fetch Twitch streams' });
	}
});
