'use strict';

const ratings = require(`${__hooks}/lib/player-ratings.js`);
const matchHistory = require(`${__hooks}/lib/match-history.js`);

const RELIC_API_BASE = 'https://coh1-lobby.reliclink.com';
const HARVEST_BATCH_SIZE = 8;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const ERROR_RETRY_MS = 60 * 60 * 1000;
const FETCH_SCRIPT = `${__hooks}/lib/fetch-insecure.py`;

function isoOffset(ms) {
	return new Date(Date.now() + ms).toISOString();
}

function matchHistoryUrl(profileId) {
	return (
		`${RELIC_API_BASE}/community/leaderboard/getrecentmatchhistorybyprofileid` +
		`?title=coh1&profile_id=${encodeURIComponent(String(profileId))}`
	);
}

function selectDuePlayers() {
	const cutoff = new Date(Date.now() - COOLDOWN_MS).toISOString();
	const rows = arrayOf(
		new DynamicModel({
			id: '',
			steamId: '',
			profileId: 0,
			harvestedAt: ''
		})
	);

	$app
		.db()
		.newQuery(
			`SELECT
				id,
				steamId,
				profileId,
				COALESCE(harvestedAt, '') AS harvestedAt
			FROM player_ratings
			WHERE profileId >= 1
				AND (
					harvestedAt IS NULL
					OR harvestedAt = ''
					OR datetime(harvestedAt) <= datetime({:cutoff})
				)
			ORDER BY CASE WHEN harvestedAt IS NULL OR harvestedAt = '' THEN 0 ELSE 1 END ASC,
				harvestedAt ASC
			LIMIT {:limit}`
		)
		.bind({ cutoff, limit: HARVEST_BATCH_SIZE })
		.all(rows);

	return rows;
}

function setHarvestedAt(id, at) {
	try {
		const record = $app.findRecordById(ratings.COLLECTION, id);
		record.set('harvestedAt', at);
		$app.save(record);
	} catch (error) {
		console.log('[player_ratings] failed to set harvestedAt', id, String(error));
	}
}

function parseNdjson(raw) {
	const byUrl = {};
	const text = String(raw || '');
	if (!text.trim()) {
		return byUrl;
	}

	for (const line of text.split(/\r?\n/)) {
		if (!line.trim()) {
			continue;
		}

		try {
			const row = JSON.parse(line);
			if (row?.url) {
				byUrl[row.url] = row;
			}
		} catch (error) {
			console.log('[player_ratings] harvest ndjson parse failed', String(error));
		}
	}

	return byUrl;
}

function fetchMatchHistories(urls) {
	if (urls.length === 0) {
		return {};
	}

	try {
		const raw = toString(
			$os.cmd('python3', FETCH_SCRIPT, '--ndjson', JSON.stringify(urls)).output()
		);
		return parseNdjson(raw);
	} catch (error) {
		console.log('[player_ratings] harvest fetch failed', String(error));
		return {};
	}
}

function harvestPlayer(player, payload) {
	if (!payload?.ok || !payload.body) {
		// Eligible again in ~1h: due query is harvestedAt <= now-24h.
		setHarvestedAt(player.id, isoOffset(ERROR_RETRY_MS - COOLDOWN_MS));
		return { updated: 0, failed: 1 };
	}

	try {
		const matches = matchHistory.transformMatchHistory(payload.body, player.profileId);
		const records = ratings.ingestTransformedMatches(matches);
		setHarvestedAt(player.id, new Date().toISOString());
		return { updated: records.length, failed: 0 };
	} catch (error) {
		console.log('[player_ratings] harvest ingest failed', player.steamId, String(error));
		setHarvestedAt(player.id, isoOffset(ERROR_RETRY_MS - COOLDOWN_MS));
		return { updated: 0, failed: 1 };
	}
}

function runBatch() {
	const players = selectDuePlayers();
	if (players.length === 0) {
		return { processed: 0, fetched: 0, updated: 0, failed: 0 };
	}

	const urls = players.map((player) => matchHistoryUrl(player.profileId));
	const byUrl = fetchMatchHistories(urls);

	let fetched = 0;
	let updated = 0;
	let failed = 0;

	for (const player of players) {
		const url = matchHistoryUrl(player.profileId);
		const payload = byUrl[url];
		if (payload?.ok) {
			fetched += 1;
		}

		const result = harvestPlayer(player, payload);
		updated += result.updated;
		failed += result.failed;
	}

	return {
		processed: players.length,
		fetched,
		updated,
		failed
	};
}

module.exports = {
	HARVEST_BATCH_SIZE,
	runBatch
};
