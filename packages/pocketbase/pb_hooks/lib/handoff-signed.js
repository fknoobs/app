'use strict';

const TTL_MS = 60_000;
const STORE_PREFIX = 'auth_handoff_used:';
const HANDOFF_VERSION = 'signed-v1';

function handoffSecret() {
	return $os.getenv('AUTH_HANDOFF_SECRET') || 'coh1stats-auth-handoff-dev';
}

function createHandoff(userId) {
	const expiresAt = Date.now() + TTL_MS;
	const body = `${userId}.${expiresAt}`;
	const signature = String($security.sha256(`${body}|${handoffSecret()}`) || '').toLowerCase();
	return `${HANDOFF_VERSION}.${body}.${signature}`;
}

function parseHandoffCode(code) {
	const raw = String(code || '').trim();
	if (!raw) {
		return null;
	}

	if (raw.startsWith(`${HANDOFF_VERSION}.`)) {
		const parts = raw.slice(HANDOFF_VERSION.length + 1).split('.');
		if (parts.length !== 3) {
			return null;
		}

		return {
			userId: parts[0],
			expiresAtRaw: parts[1],
			signature: parts[2]
		};
	}

	const legacyParts = raw.split('|');
	if (legacyParts.length !== 3) {
		return null;
	}

	return {
		userId: legacyParts[0],
		expiresAtRaw: legacyParts[1],
		signature: legacyParts[2]
	};
}

function exchangeHandoff(code) {
	const parsed = parseHandoffCode(code);
	if (!parsed) {
		throw new BadRequestError('Invalid or expired login code.');
	}

	const { userId, expiresAtRaw, signature } = parsed;
	const expiresAt = Number(expiresAtRaw);
	const body = `${userId}.${expiresAtRaw}`;
	const expected = String($security.sha256(`${body}|${handoffSecret()}`) || '').toLowerCase();

	if (!userId || !signature || signature !== expected) {
		throw new BadRequestError('Invalid or expired login code.');
	}

	if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
		throw new BadRequestError('Invalid or expired login code.');
	}

	const usedKey = STORE_PREFIX + signature;
	if ($app.store().get(usedKey)) {
		throw new BadRequestError('Invalid or expired login code.');
	}

	$app.store().set(usedKey, String(Date.now()));

	return userId;
}

function handleCreate(e) {
	const auth = e.auth;
	if (!auth) {
		throw new UnauthorizedError('You must be signed in.');
	}

	const code = createHandoff(auth.id);
	return e.json(200, { code });
}

function handleExchange(e) {
	const raw = toString(e.request.body);
	let body = {};

	if (raw) {
		try {
			body = JSON.parse(raw);
		} catch {
			throw new BadRequestError('Invalid JSON body.');
		}
	}

	const code = typeof body.code === 'string' ? body.code.trim() : '';
	if (!code) {
		throw new BadRequestError('code is required.');
	}

	const userId = exchangeHandoff(code);
	const user = $app.findRecordById('users', userId);
	return $apis.recordAuthResponse(e, user);
}

module.exports = {
	createHandoff,
	exchangeHandoff,
	handleCreate,
	handleExchange
};
