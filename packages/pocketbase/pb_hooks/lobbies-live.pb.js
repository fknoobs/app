/// <reference path="../pb_data/types.d.ts" />

'use strict';

// Older clients still upload the full in-memory player objects; strip the heavy
// per-player payloads server-side so the row stays small.
function slimPlayers(e) {
	const { slimLobbyPlayers } = require(`${__hooks}/lib/lobby-players.js`);
	const raw = e.record.get('players');
	const players = Array.isArray(raw) ? raw : [];
	const slim = slimLobbyPlayers(players);
	if (slim.changed) {
		e.record.set('players', slim.players);
	}
	e.next();
}

onRecordCreate(slimPlayers, 'lobbies_live');
onRecordUpdate(slimPlayers, 'lobbies_live');

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
