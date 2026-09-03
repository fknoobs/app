/// <reference path="../pb_data/types.d.ts" />

'use strict';

onRecordCreateRequest((e) => {
	require(`${__hooks}/lib/reputation.js`).assertUniqueTrigger(e.record);
	e.next();
}, 'reputation_types');

onRecordUpdateRequest((e) => {
	require(`${__hooks}/lib/reputation.js`).assertUniqueTrigger(e.record);
	e.next();
}, 'reputation_types');

onRecordUpdateRequest((e) => {
	require(`${__hooks}/lib/reputation.js`).restoreUserReputation(e);
}, 'users');

$app.onServe().bindFunc((e) => {
	e.next();
	cronAdd('reputation_backfill', '8-59/5 * * * *', () => {
		const backfill = require(`${__hooks}/lib/reputation-backfill.js`);
		if (backfill.isComplete()) return;
		const result = backfill.runBatch();
		console.log(
			`[reputation] backfill phase=${result.phase} processed=${result.processed} complete=${result.complete}`
		);
	});
});
