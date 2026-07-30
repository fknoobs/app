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
		const records = $app.findRecordsByFilter(
			'lobbies_live',
			'updatedAt < {:threshold}',
			'',
			200,
			0,
			{ threshold }
		);

		if (!records.length) {
			return;
		}

		let deleted = 0;
		for (const record of records) {
			try {
				$app.delete(record);
				deleted += 1;
			} catch (error) {
				console.warn('[lobbies_live] cleanup delete failed:', record.id, error);
			}
		}

		if (deleted > 0) {
			console.log(`[lobbies_live] cleaned ${deleted} stale row(s)`);
		}
	});
});
