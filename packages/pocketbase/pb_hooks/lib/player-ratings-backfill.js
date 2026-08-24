'use strict';

const ratings = require(`${__hooks}/lib/player-ratings.js`);
const jobState = require(`${__hooks}/lib/job-state.js`);

const BACKFILL_BATCH_SIZE = 100;
const JOB_ID = 'player_ratings_backfill';

function isComplete() {
	return jobState.isComplete(JOB_ID);
}

function runBatch() {
	const state = jobState.readState(JOB_ID);
	const page = state.page;
	const offset = (page - 1) * BACKFILL_BATCH_SIZE;

	if (state.complete) {
		return { processed: 0, updated: 0, complete: true };
	}

	const rows = arrayOf(
		new DynamicModel({
			id: '',
			title: '',
			result: ''
		})
	);

	$app
		.db()
		.newQuery(
			`SELECT
				id,
				COALESCE(title, '') AS title,
				COALESCE(result, '') AS result
			FROM lobbies
			WHERE result IS NOT NULL
				AND result != ''
				AND result != 'null'
				AND title != 'Skirmish'
			ORDER BY createdAt ASC
			LIMIT {:limit} OFFSET {:offset}`
		)
		.bind({ limit: BACKFILL_BATCH_SIZE, offset })
		.all(rows);

	if (rows.length === 0) {
		jobState.setComplete(JOB_ID, page);
		return { processed: 0, updated: 0, complete: true };
	}

	let updated = 0;

	for (const row of rows) {
		const records = ratings.ingestLobbyResult(row.result);
		if (records.length > 0) {
			updated += 1;
		}
	}

	if (rows.length < BACKFILL_BATCH_SIZE) {
		jobState.setComplete(JOB_ID, page + 1);
		return { processed: rows.length, updated, complete: true };
	}

	jobState.setPage(JOB_ID, page + 1);
	return { processed: rows.length, updated, complete: false };
}

function reset() {
	jobState.reset(JOB_ID);
}

function getPage() {
	return jobState.getPage(JOB_ID);
}

module.exports = {
	isComplete,
	runBatch,
	reset,
	getPage
};
