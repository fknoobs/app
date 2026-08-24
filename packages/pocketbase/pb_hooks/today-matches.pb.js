/// <reference path="../pb_data/types.d.ts" />

'use strict';

routerAdd('GET', '/api/today-matches', (e) => {
	const { loadTodayMatches } = require(`${__hooks}/lib/today-matches.js`);

	const query = e.request.url.query();
	const userId = query.get('userId') || '';
	const todayStart = query.get('todayStart') || '';

	if (!userId) {
		return e.json(400, { message: 'userId is required' });
	}

	if (!todayStart) {
		return e.json(400, { message: 'todayStart is required' });
	}

	try {
		return e.json(200, {
			items: loadTodayMatches(userId, todayStart)
		});
	} catch (error) {
		return e.json(400, { message: String(error?.message || error) });
	}
});
