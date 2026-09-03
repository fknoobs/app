'use strict';

const jobState = require(`${__hooks}/lib/job-state.js`);
const reputation = require(`${__hooks}/lib/reputation.js`);

const BATCH_SIZE = 200;

function isComplete() {
	const phases = phaseList();
	for (let i = 0; i < phases.length; i++) {
		if (!jobState.isComplete(phases[i].id)) {
			return false;
		}
	}
	return true;
}

function voteValue(raw) {
	if (Number(raw) === -1) {
		return -1;
	}

	return 1;
}

function runPhase(phase, query, bindModel, applyRow) {
	const state = jobState.readState(phase.id);
	if (state.complete) {
		return { phase: phase.id, processed: 0, complete: true };
	}

	const page = state.page;
	const offset = (page - 1) * BATCH_SIZE;
	const rows = arrayOf(bindModel);
	try {
		$app
			.db()
			.newQuery(query)
			.bind({ limit: BATCH_SIZE, offset })
			.all(rows);
	} catch (error) {
		console.warn('[reputation] backfill query', phase.id, String(error?.message || error));
		jobState.setComplete(phase.id, page);
		return { phase: phase.id, processed: 0, complete: true };
	}

	for (let i = 0; i < rows.length; i++) {
		try {
			applyRow(rows[i]);
		} catch (error) {
			console.warn('[reputation] backfill row', phase.id, String(error?.message || error));
		}
	}

	if (rows.length < BATCH_SIZE) {
		jobState.setComplete(phase.id, page);
		return { phase: phase.id, processed: rows.length, complete: true };
	}

	jobState.setPage(phase.id, page + 1);
	return { phase: phase.id, processed: rows.length, complete: false };
}

function backfillComments() {
	return runPhase(
		{ id: 'reputation_bf_comments' },
		`SELECT id, COALESCE(user, '') AS user
		 FROM lobby_comments
		 WHERE COALESCE(deleted, 0) = 0
		 ORDER BY id ASC
		 LIMIT {:limit} OFFSET {:offset}`,
		new DynamicModel({ id: '', user: '' }),
		(row) => {
			if (!row.id || !row.user) return;
			reputation.award(row.user, 'comment_created', row.id);
		}
	);
}

function backfillCommentLikes() {
	return runPhase(
		{ id: 'reputation_bf_comment_likes' },
		`SELECT cl.id AS id,
			COALESCE(cl.user, '') AS voter,
			COALESCE(cl.value, 1) AS value,
			COALESCE(c.user, '') AS author
		 FROM lobby_comment_likes cl
		 JOIN lobby_comments c ON c.id = cl.comment
		 ORDER BY cl.id ASC
		 LIMIT {:limit} OFFSET {:offset}`,
		new DynamicModel({ id: '', voter: '', value: 0, author: '' }),
		(row) => {
			if (!row.id) return;
			reputation.setVoteReputation({
				voterId: row.voter,
				authorId: row.author,
				sourceId: row.id,
				value: voteValue(row.value),
				prefix: 'comment'
			});
		}
	);
}

function backfillLobbyLikes() {
	return runPhase(
		{ id: 'reputation_bf_lobby_likes' },
		`SELECT ll.id AS id,
			COALESCE(ll.user, '') AS voter,
			COALESCE(ll.value, 1) AS value,
			COALESCE(l.user, '') AS author
		 FROM lobby_likes ll
		 JOIN lobbies l ON l.id = ll.lobby
		 ORDER BY ll.id ASC
		 LIMIT {:limit} OFFSET {:offset}`,
		new DynamicModel({ id: '', voter: '', value: 0, author: '' }),
		(row) => {
			if (!row.id) return;
			reputation.setVoteReputation({
				voterId: row.voter,
				authorId: row.author,
				sourceId: row.id,
				value: voteValue(row.value),
				prefix: 'replay'
			});
		}
	);
}

function backfillDownloads() {
	return runPhase(
		{ id: 'reputation_bf_downloads' },
		`SELECT d.id AS id,
			COALESCE(d.user, '') AS downloader,
			COALESCE(l.user, '') AS uploader
		 FROM lobby_downloads d
		 JOIN lobbies l ON l.id = d.lobby
		 ORDER BY d.id ASC
		 LIMIT {:limit} OFFSET {:offset}`,
		new DynamicModel({ id: '', downloader: '', uploader: '' }),
		(row) => {
			if (!row.id) return;
			reputation.awardReplayDownload({
				uploaderId: row.uploader,
				downloaderId: row.downloader,
				sourceId: row.id
			});
		}
	);
}

function backfillFingerprints() {
	return runPhase(
		{ id: 'reputation_bf_fingerprints' },
		`SELECT MIN(f.id) AS id, COALESCE(l.user, '') AS uploader
		 FROM lobby_download_fingerprints f
		 JOIN lobbies l ON l.id = f.lobby
		 GROUP BY f.lobby, f.created
		 ORDER BY MIN(f.id) ASC
		 LIMIT {:limit} OFFSET {:offset}`,
		new DynamicModel({ id: '', uploader: '' }),
		(row) => {
			if (!row.id) return;
			reputation.awardReplayDownload({
				uploaderId: row.uploader,
				downloaderId: '',
				sourceId: row.id
			});
		}
	);
}

function backfillLobbies() {
	return runPhase(
		{ id: 'reputation_bf_lobbies' },
		`SELECT id FROM lobbies
		 ORDER BY createdAt ASC
		 LIMIT {:limit} OFFSET {:offset}`,
		new DynamicModel({ id: '' }),
		(row) => {
			if (!row.id) return;
			reputation.awardMatchPlayed(row.id);
		}
	);
}

function phaseList() {
	return [
		{ id: 'reputation_bf_comments', run: backfillComments },
		{ id: 'reputation_bf_comment_likes', run: backfillCommentLikes },
		{ id: 'reputation_bf_lobby_likes', run: backfillLobbyLikes },
		{ id: 'reputation_bf_downloads', run: backfillDownloads },
		{ id: 'reputation_bf_fingerprints', run: backfillFingerprints },
		{ id: 'reputation_bf_lobbies', run: backfillLobbies }
	];
}

function runBatch() {
	const phases = phaseList();
	for (let i = 0; i < phases.length; i++) {
		const phase = phases[i];
		if (jobState.isComplete(phase.id)) {
			continue;
		}

		return phase.run();
	}

	return { phase: '', processed: 0, complete: true };
}

module.exports = {
	isComplete,
	runBatch
};
