'use strict';

const ratings = require(`${__hooks}/lib/player-ratings.js`);

const BACKFILL_BATCH_SIZE = 100;
const BACKFILL_PAGE_KEY = 'player_ratings_backfill_page';
const BACKFILL_COMPLETE_KEY = 'player_ratings_backfill_complete';

function isComplete() {
	return $app.store().get(BACKFILL_COMPLETE_KEY) === true;
}

function runBatch() {
	const page = Number($app.store().get(BACKFILL_PAGE_KEY) || 1);
	const offset = (page - 1) * BACKFILL_BATCH_SIZE;

	if (isComplete()) {
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
		$app.store().set(BACKFILL_COMPLETE_KEY, true);
		return { processed: 0, updated: 0, complete: true };
	}

	let updated = 0;

	for (const row of rows) {
		const records = ratings.ingestLobbyResult(row.result);
		if (records.length > 0) {
			updated += 1;
		}
	}

	$app.store().set(BACKFILL_PAGE_KEY, page + 1);

	if (rows.length < BACKFILL_BATCH_SIZE) {
		$app.store().set(BACKFILL_COMPLETE_KEY, true);
		return { processed: rows.length, updated, complete: true };
	}

	return { processed: rows.length, updated, complete: false };
}

function reset() {
	$app.store().set(BACKFILL_COMPLETE_KEY, false);
	$app.store().set(BACKFILL_PAGE_KEY, 1);
}

function getPage() {
	return Number($app.store().get(BACKFILL_PAGE_KEY) || 1);
}

module.exports = {
	isComplete,
	runBatch,
	reset,
	getPage
};
