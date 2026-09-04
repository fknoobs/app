/// <reference path="../../pb_data/types.d.ts" />

'use strict';

const CAPTURES_COLLECTION = 'anti_cheat_captures';

const ANALYSIS_STATUS_VALUES = ['pending', 'skipped', 'clean', 'flagged', 'error'];

function getServiceToken() {
	// Prefer a dedicated anti-cheat token, but fall back to the existing smurf token
	// since pocketbase docker-compose only wires SMURF_SERVICE_TOKEN.
	return $os.getenv('ANTI_CHEAT_SERVICE_TOKEN') || $os.getenv('SMURF_SERVICE_TOKEN') || '';
}

function isServiceRequest(e) {
	const token = getServiceToken();
	if (!token) return false;

	const auth = e.request.header.get('Authorization') || '';
	return auth === `Bearer ${token}`;
}

function readRequestJsonBody(e) {
	try {
		const raw = toString(e.request.body);
		if (raw) return JSON.parse(raw);
	} catch {
		// ignore; we try other extraction below
	}

	try {
		const body = e.requestInfo()?.body;
		if (body && typeof body === 'object') return body;
	} catch {
		// ignore
	}

	return {};
}

function getLimit(e) {
	const raw = e.request.url.query().get('limit');
	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed <= 0) return 10;
	return Math.min(parsed, 50);
}

function normalizeAnalysisStatus(status) {
	if (!status) return undefined;
	if (!ANALYSIS_STATUS_VALUES.includes(status)) return undefined;
	return status;
}

function handleWorkerBatch(e) {
	if (!isServiceRequest(e)) {
		return e.json(401, { message: 'Unauthorized' });
	}

	const limit = getLimit(e);
	const now = new Date().toISOString();

	const captures = arrayOf(
		new DynamicModel({
			id: '',
			user: '',
			session_id: nullInt(),
			map: '',
			game_focused: nullBool(),
			steam_id: '',
			captured_at: '',
			image: ''
		})
	);

	$app
		.db()
		.newQuery(
			`SELECT id, user, session_id, map, game_focused, steam_id, captured_at, image
       FROM anti_cheat_captures
       WHERE analysis_status IS NULL OR analysis_status = 'pending'
       ORDER BY captured_at ASC
       LIMIT {:limit}`
		)
		.bind({ limit })
		.all(captures);

	return e.json(200, {
		// Keep both names for compatibility with worker implementations.
		items: captures,
		captures,
		fetched_at: now
	});
}

function handleWorkerPatch(e) {
	if (!isServiceRequest(e)) {
		return e.json(401, { message: 'Unauthorized' });
	}

	const id = e.request.pathValue('id');
	if (!id) {
		return e.json(400, { message: 'id is required' });
	}

	const body = readRequestJsonBody(e);
	if (Object.keys(body).length === 0) {
		return e.json(400, { message: 'Request body is required' });
	}

	let record;
	try {
		record = $app.findRecordById(CAPTURES_COLLECTION, id);
	} catch {
		return e.json(404, { message: 'Not found' });
	}

	if (body.analysis_status !== undefined) {
		const status = normalizeAnalysisStatus(body.analysis_status);
		if (status) {
			record.set('analysis_status', status);
		}
	}

	if (body.analysis_score !== undefined) {
		// Accept numbers; PocketBase will coerce/validate.
		record.set('analysis_score', body.analysis_score);
	}

	if (body.analysis_notes !== undefined) {
		record.set('analysis_notes', body.analysis_notes);
	}

	$app.save(record);

	return e.json(200, {
		id: record.id,
		analysis_status: record.get('analysis_status'),
		analysis_score: record.get('analysis_score') || null,
		analysis_notes: record.get('analysis_notes') || null
	});
}

module.exports = {
	handleWorkerBatch,
	handleWorkerPatch
};

