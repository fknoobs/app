'use strict';

/**
 * Persistent cursor for the batch jobs. These used to live in `$app.store()`,
 * which is process memory: every restart reset them to page 1, so the heavy
 * backfills never finished and kept rewriting the same rows.
 */
function readState(jobId) {
	try {
		const record = $app.findRecordById('job_state', jobId);
		return {
			page: Number(record.get('page')) || 1,
			complete: Boolean(record.get('complete'))
		};
	} catch {
		return { page: 1, complete: false };
	}
}

function writeState(jobId, page, complete) {
	let record;

	try {
		record = $app.findRecordById('job_state', jobId);
	} catch {
		try {
			record = new Record($app.findCollectionByNameOrId('job_state'));
			record.set('id', jobId);
		} catch {
			return;
		}
	}

	record.set('page', page);
	record.set('complete', complete);

	try {
		$app.save(record);
	} catch (error) {
		console.warn('[job_state] save failed for', jobId, String(error?.message || error));
	}
}

function getPage(jobId) {
	return readState(jobId).page;
}

function isComplete(jobId) {
	return readState(jobId).complete;
}

function setPage(jobId, page) {
	writeState(jobId, page, false);
}

function setComplete(jobId, page) {
	writeState(jobId, page, true);
}

function reset(jobId) {
	writeState(jobId, 1, false);
}

module.exports = {
	readState,
	getPage,
	isComplete,
	setPage,
	setComplete,
	reset
};
