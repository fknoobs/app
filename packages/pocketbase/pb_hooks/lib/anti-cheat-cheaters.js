'use strict';

const COLLECTION = 'anti_cheat_cheaters';
const syncing = {};

function hasCollection() {
	try {
		$app.findCollectionByNameOrId(COLLECTION);
		return true;
	} catch {
		return false;
	}
}

function escapeFilter(value) {
	return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function listRowsForUser(userId) {
	if (!userId || !hasCollection()) return [];
	try {
		return $app.findRecordsByFilter(
			COLLECTION,
			`user = "${escapeFilter(userId)}"`,
			'',
			200,
			0
		);
	} catch {
		return [];
	}
}

function labeledByOf(rows) {
	for (let i = 0; i < rows.length; i++) {
		const labeledBy = rows[i].get('labeled_by');
		if (labeledBy) return labeledBy;
	}
	return '';
}

function syncForUser(userId) {
	if (!userId || syncing[userId] || !hasCollection()) {
		return { created: 0 };
	}

	syncing[userId] = true;
	try {
		const existing = listRowsForUser(userId);
		if (existing.length === 0) {
			return { created: 0 };
		}

		const merge = require(`${__hooks}/lib/user-merge.js`);
		const steamIds = merge.loadSteamIdsForUser(userId);
		if (steamIds.length === 0) {
			return { created: 0 };
		}

		const have = {};
		for (let i = 0; i < existing.length; i++) {
			const steamId = String(existing[i].get('steam_id') || '').trim();
			if (steamId) have[steamId] = true;
		}

		const labeledBy = labeledByOf(existing);
		const collection = $app.findCollectionByNameOrId(COLLECTION);
		let created = 0;

		for (let i = 0; i < steamIds.length; i++) {
			const steamId = steamIds[i];
			if (!steamId || have[steamId]) continue;
			try {
				const record = new Record(collection);
				record.set('user', userId);
				record.set('steam_id', steamId);
				if (labeledBy) record.set('labeled_by', labeledBy);
				$app.save(record);
				have[steamId] = true;
				created += 1;
			} catch (error) {
				console.warn(
					'[anti_cheat_cheaters] create',
					userId,
					steamId,
					String(error?.message || error)
				);
			}
		}

		return { created };
	} finally {
		delete syncing[userId];
	}
}

function syncAll() {
	if (!hasCollection()) {
		return { users: 0, created: 0 };
	}

	let rows = [];
	try {
		rows = $app.findRecordsByFilter(COLLECTION, 'id != ""', '', 500, 0);
	} catch (error) {
		console.warn('[anti_cheat_cheaters] list', String(error?.message || error));
		return { users: 0, created: 0 };
	}

	const seen = {};
	let users = 0;
	let created = 0;
	for (let i = 0; i < rows.length; i++) {
		const userId = rows[i].get('user');
		if (!userId || seen[userId]) continue;
		seen[userId] = true;
		users += 1;
		created += syncForUser(userId).created;
	}

	return { users, created };
}

module.exports = {
	syncForUser,
	syncAll
};
