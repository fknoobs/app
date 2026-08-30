'use strict';

const ASSIGNMENTS = 'player_label_assignments';
const LABELS = 'user_labels';
const BATCH_SIZE = 40;

function hasCollection(name) {
	try {
		$app.findCollectionByNameOrId(name);
		return true;
	} catch {
		return false;
	}
}

function sortLabels(labels) {
	return [...labels].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || String(a.name).localeCompare(b.name));
}

function serializeLabel(record) {
	if (!record) {
		return null;
	}
	return {
		id: record.id,
		name: String(record.get('name') || ''),
		color: String(record.get('color') || '#F8C630'),
		sort: Number(record.get('sort') ?? 0)
	};
}

function labelIdOf(row) {
	const value = row.get('label');
	if (!value) {
		return '';
	}
	if (typeof value === 'string') {
		return value;
	}
	if (typeof value === 'object' && value.id) {
		return String(value.id);
	}
	return String(value);
}

function loadLabelsBySteamIds(steamIds) {
	const bySteam = {};
	if (!hasCollection(ASSIGNMENTS) || !hasCollection(LABELS)) {
		return bySteam;
	}

	const unique = [];
	const seenSteam = {};
	for (const steamId of steamIds ?? []) {
		if (!steamId || seenSteam[steamId]) {
			continue;
		}
		seenSteam[steamId] = true;
		unique.push(String(steamId));
	}
	if (unique.length === 0) {
		return bySteam;
	}

	const assignments = [];
	for (let i = 0; i < unique.length; i += BATCH_SIZE) {
		const chunk = unique.slice(i, i + BATCH_SIZE);
		const params = {};
		const filter = chunk
			.map((_, index) => {
				params[`s${index}`] = chunk[index];
				return `steamId = {:s${index}}`;
			})
			.join(' || ');
		try {
			const rows = $app.findRecordsByFilter(ASSIGNMENTS, filter, '', 500, 0, params);
			assignments.push(...rows);
		} catch (error) {
			$app.logger().warn(
				'Player labels batch failed',
				'source',
				'player-labels',
				'error',
				String(error)
			);
		}
	}

	const labelsById = {};
	for (const row of assignments) {
		const id = labelIdOf(row);
		if (!id || labelsById[id]) {
			continue;
		}
		try {
			labelsById[id] = serializeLabel($app.findRecordById(LABELS, id));
		} catch {
			labelsById[id] = null;
		}
	}

	for (const row of assignments) {
		const steamId = String(row.get('steamId') || '');
		const label = labelsById[labelIdOf(row)];
		if (!steamId || !label) {
			continue;
		}
		const current = bySteam[steamId] ?? [];
		current.push(label);
		bySteam[steamId] = current;
	}

	for (const steamId of Object.keys(bySteam)) {
		bySteam[steamId] = sortLabels(bySteam[steamId]);
	}
	return bySteam;
}

function loadLabelsForSteamId(steamId) {
	if (!steamId) {
		return [];
	}
	return loadLabelsBySteamIds([steamId])[steamId] ?? [];
}

function steamIdsFromMatches(matches) {
	const ids = [];
	for (const match of matches ?? []) {
		for (const player of match.players ?? []) {
			if (player.steamId) {
				ids.push(player.steamId);
			}
		}
	}
	return ids;
}

function attachLabelsToMatches(matches, labelsBySteamId) {
	if (!matches || matches.length === 0) {
		return matches || [];
	}
	for (const match of matches) {
		for (const player of match.players ?? []) {
			player.labels = labelsBySteamId[player.steamId] ?? [];
		}
	}
	return matches;
}

module.exports = {
	loadLabelsBySteamIds,
	loadLabelsForSteamId,
	steamIdsFromMatches,
	attachLabelsToMatches
};
