/// <reference path="../pb_data/types.d.ts" />

'use strict';

$app.onServe().bindFunc((e) => {
	e.next();
	// Offset from the */5 lobbies writers (0–4) and the */2 slim job.
	cronAdd('lobbies_dedupe', '7-59/10 * * * *', () => {
		const dedupe = require(`${__hooks}/lib/lobbies-dedupe.js`);
		if (dedupe.isComplete()) {
			if (!dedupe.hasDuplicates()) {
				return;
			}
			dedupe.reset();
		}
		const result = dedupe.runBatch();
		console.log(
			`[lobbies_dedupe] batch groups=${result.groups} deleted=${result.deleted} complete=${result.complete}`
		);
	});
});

routerAdd('POST', '/api/lobbies/dedupe/run', (e) => {
	const lobby = require(`${__hooks}/lib/lobby-players.js`);
	if (!lobby.isServiceRequest(e) && !e.hasSuperuserAuth()) {
		return e.json(401, { message: 'Unauthorized' });
	}
	const dedupe = require(`${__hooks}/lib/lobbies-dedupe.js`);
	const query = e.request.url.query();
	if (query.get('reset') === 'true' || (dedupe.isComplete() && dedupe.hasDuplicates())) {
		dedupe.reset();
	}
	const batches = Math.min(Math.max(parseInt(query.get('batches') || '1', 10) || 1, 1), 200);
	let groups = 0;
	let deleted = 0;
	let complete = false;
	for (let i = 0; i < batches && !complete; i++) {
		const result = dedupe.runBatch();
		groups += result.groups;
		deleted += result.deleted;
		complete = result.complete;
	}
	return e.json(200, {
		groups,
		deleted,
		complete,
		hasDuplicates: dedupe.hasDuplicates()
	});
});
