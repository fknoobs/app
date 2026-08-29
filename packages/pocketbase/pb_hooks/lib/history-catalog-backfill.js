'use strict';

const JOB_ID = 'history_catalog_backfill';
const BATCH_SIZE = 250;
const lobbyPlayers = require(`${__hooks}/lib/lobby-players.js`);
const jobState = require(`${__hooks}/lib/job-state.js`);

function isComplete() {
	return jobState.isComplete(JOB_ID);
}

function runBatch() {
	const state = jobState.readState(JOB_ID);
	if (state.complete) {
		return { processed: 0, cataloged: 0, complete: true };
	}

	const offset = (state.page - 1) * BATCH_SIZE;
	const rows = arrayOf(
		new DynamicModel({
			id: '',
			map: '',
			title: '',
			needsResult: false,
			lobbyPlayers: '',
			result: ''
		})
	);

	$app
		.db()
		.newQuery(
			`SELECT
				id,
				COALESCE(map, '') AS map,
				COALESCE(title, '') AS title,
				COALESCE(needsResult, 0) AS needsResult,
				COALESCE(lobbyPlayers, '[]') AS lobbyPlayers,
				COALESCE(result, '') AS result
			FROM lobbies
			WHERE needsResult = 0 AND title != 'Skirmish'
			ORDER BY createdAt ASC
			LIMIT {:limit} OFFSET {:offset}`
		)
		.bind({ limit: BATCH_SIZE, offset })
		.all(rows);

	if (rows.length === 0) {
		jobState.setComplete(JOB_ID, state.page);
		return { processed: 0, cataloged: 0, complete: true };
	}

	let cataloged = 0;
	for (const row of rows) {
		let summaries = [];
		try {
			const parsed = JSON.parse(row.lobbyPlayers || '[]');
			if (Array.isArray(parsed)) {
				summaries = parsed;
			}
		} catch {
			summaries = [];
		}
		lobbyPlayers.upsertHistoryCatalog(summaries, row.map);
		try {
			lobbyPlayers.backfillLobbyPlayerElo(row.id);
			lobbyPlayers.backfillLobbyPlayerSlot(row.id);
			const record = $app.findRecordById('lobbies', row.id);
			if (record.get('durationSeconds') && record.get('avgElo')) {
				cataloged += 1;
				continue;
			}
			lobbyPlayers.applyLobbyFilterStats(record, row.result);
			$app.save(record);
		} catch {
			// lobby gone
		}
		cataloged += 1;
	}

	if (rows.length < BATCH_SIZE) {
		jobState.setComplete(JOB_ID, state.page + 1);
		return { processed: rows.length, cataloged, complete: true };
	}

	jobState.setPage(JOB_ID, state.page + 1);
	return { processed: rows.length, cataloged, complete: false };
}

function reset() {
	jobState.reset(JOB_ID);
}

module.exports = {
	isComplete,
	runBatch,
	reset
};
