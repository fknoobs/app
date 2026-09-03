/// <reference path="../pb_data/types.d.ts" />

'use strict';

// Orphaned rows linger when clients Alt+F4 / Exit to Windows without APP -- Game Stop.
// Heartbeats refresh updatedAt every ~2 minutes; anything older than STALE_MS is dead.
// Note: cron callbacks run in an isolated scope — require constants inside the callback.
$app.onServe().bindFunc((e) => {
	e.next();

	cronAdd('lobbies_live_cleanup', '* * * * *', () => {
		const { LOBBIES_LIVE_STALE_MS } = require(`${__hooks}/lib/lobbies-live.js`);
		const threshold = new Date(Date.now() - LOBBIES_LIVE_STALE_MS).toISOString().replace('T', ' ');
		try {
			$app
				.db()
				.newQuery('DELETE FROM lobbies_live WHERE updatedAt < {:threshold}')
				.bind({ threshold })
				.execute();
		} catch (error) {
			console.warn('[lobbies_live] cleanup failed:', error);
		}
	});
});
