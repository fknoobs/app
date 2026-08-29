/// <reference path="../pb_data/types.d.ts" />

'use strict';

onRecordCreate((e) => {
	require(`${__hooks}/lib/lobbies-dedupe.js`).assertUniqueSession(e.record);
	require(`${__hooks}/lib/lobby-players.js`).processLobbyRecord(e);
	e.next();
}, 'lobbies');

onRecordUpdate((e) => {
	require(`${__hooks}/lib/lobby-players.js`).processLobbyRecord(e);
	e.next();
}, 'lobbies');

onRecordAfterCreateSuccess((e) => {
	require(`${__hooks}/lib/lobby-players.js`).syncLobbyPlayerIndexForRecord(e);
}, 'lobbies');

onRecordAfterUpdateSuccess((e) => {
	require(`${__hooks}/lib/lobby-players.js`).syncLobbyPlayerIndexForRecord(e);
}, 'lobbies');

$app.onServe().bindFunc((e) => {
	e.next();

	// Staggered across the five-minute window: these all write to `lobbies` /
	// `lobby_player_index`, so running them in the same minute starved reads.
	cronAdd('lobby_players_backfill', '*/5 * * * *', () => {
		const backfill = require(`${__hooks}/lib/lobby-players-backfill.js`);
		if (backfill.isComplete()) {
			const repaired = backfill.repairEmptyLobbyPlayers(100);
			if (repaired.updated > 0) {
				console.log(
					`[lobby_players] repair updated=${repaired.updated} scanned=${repaired.scanned}`
				);
			}
			return;
		}

		const result = backfill.runBatch();
		console.log(
			`[lobby_players] backfill batch processed=${result.processed} updated=${result.updated} indexed=${result.indexed} complete=${result.complete}`
		);
	});

	cronAdd('history_catalog_backfill', '1-59/5 * * * *', () => {
		const catalog = require(`${__hooks}/lib/history-catalog-backfill.js`);
		if (catalog.isComplete()) {
			return;
		}
		const result = catalog.runBatch();
		console.log(
			`[history_catalog] backfill processed=${result.processed} cataloged=${result.cataloged} complete=${result.complete}`
		);
	});
});

routerAdd('POST', '/api/lobby-players/backfill/run', (e) => {
	const lobby = require(`${__hooks}/lib/lobby-players.js`);
	if (!lobby.isServiceRequest(e) && !e.hasSuperuserAuth()) {
		return e.json(401, { message: 'Unauthorized' });
	}

	const lobbyBackfill = require(`${__hooks}/lib/lobby-players-backfill.js`);
	const reset = e.request.url.query().get('reset') === 'true';
	if (reset) {
		lobbyBackfill.reset();
	}

	const result = lobbyBackfill.runBatch();

	return e.json(200, {
		...result,
		page: lobbyBackfill.getPage(),
		complete: lobbyBackfill.isComplete()
	});
});
