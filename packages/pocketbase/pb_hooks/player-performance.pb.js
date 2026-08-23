/// <reference path="../pb_data/types.d.ts" />

'use strict';

routerAdd('GET', '/api/player-performance', (e) => {
	const { emptyPerformance, loadPlayerPerformance } = require(`${__hooks}/lib/player-performance.js`);

	const query = e.request.url.query();
	const scope = query.get('scope') || 'user';
	const userId = query.get('userId') || '';
	const profileId = parseInt(query.get('profileId') || '', 10);

	if (!Number.isFinite(profileId) || profileId <= 0) {
		return e.json(400, { message: 'profileId required' });
	}

	if (scope !== 'user' && scope !== 'community') {
		return e.json(400, { message: 'invalid scope' });
	}

	if (scope === 'user' && !userId) {
		return e.json(400, { message: 'userId required for user scope' });
	}

	try {
		return e.json(200, loadPlayerPerformance(profileId, scope, userId));
	} catch (error) {
		console.warn('[player_performance] query failed:', String(error?.message || error));
		return e.json(200, emptyPerformance());
	}
});
