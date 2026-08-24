'use strict';

const ratings = require(`${__hooks}/lib/player-ratings.js`);
const matchHistory = require(`${__hooks}/lib/match-history.js`);

const RELIC_API_BASE = 'https://coh1-lobby.reliclink.com';
const HARVEST_BATCH_SIZE = 8;
const SNOWBALL_BATCH_SIZE = 8;
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
			harvestedAt: '',
			elo: ''
		})
	);

	$app
		.db()
		.newQuery(
			`SELECT
				id,
				steamId,
				profileId,
				COALESCE(harvestedAt, '') AS harvestedAt,
				COALESCE(elo, '') AS elo
			FROM player_ratings
			WHERE profileId >= 1
				AND (
					harvestedAt IS NULL
					OR harvestedAt = ''
					OR datetime(harvestedAt) <= datetime({:cutoff})
				)
			LIMIT 64`
		)
		.bind({ cutoff })
		.all(rows);

	rows.sort((a, b) => {
		const aNever = !a.harvestedAt ? 0 : 1;
		const bNever = !b.harvestedAt ? 0 : 1;
		if (aNever !== bNever) {
			return aNever - bNever;
		}

		return ratings.countEloSlots(a.elo) - ratings.countEloSlots(b.elo);
	});

	return rows.slice(0, HARVEST_BATCH_SIZE);
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

function setHarvestedAtByProfileId(profileId, at) {
	const record = ratings.findByProfileId(profileId);
	if (!record) {
		return;
	}

	setHarvestedAt(record.id, at);
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
		return { updated: 0, failed: 1, matches: [] };
	}

	try {
		const matches = matchHistory.transformMatchHistory(payload.body, player.profileId);
		const records = ratings.ingestTransformedMatches(matches);
		setHarvestedAt(player.id, new Date().toISOString());
		return { updated: records.length, failed: 0, matches };
	} catch (error) {
		console.log('[player_ratings] harvest ingest failed', player.steamId, String(error));
		setHarvestedAt(player.id, isoOffset(ERROR_RETRY_MS - COOLDOWN_MS));
		return { updated: 0, failed: 1, matches: [] };
	}
}

function harvestProfileId(profileId, payload) {
	if (!payload?.ok || !payload.body) {
		return { updated: 0, failed: 1, matches: [] };
	}

	try {
		const matches = matchHistory.transformMatchHistory(payload.body, profileId);
		const records = ratings.ingestTransformedMatches(matches);
		setHarvestedAtByProfileId(profileId, new Date().toISOString());
		return { updated: records.length, failed: 0, matches };
	} catch (error) {
		console.log('[player_ratings] snowball ingest failed', profileId, String(error));
		return { updated: 0, failed: 1, matches: [] };
	}
}

function collectTeammateProfileIds(matches, excludeProfileIds) {
	const excluded = {};
	for (const id of excludeProfileIds) {
		excluded[Number(id)] = true;
	}

	const found = {};

	for (const match of ratings.asList(matches)) {
		for (const player of ratings.asList(match.players)) {
			const profileId = Number(player.profile_id);
			const alias = typeof player.alias === 'string' ? player.alias.trim() : '';

			if (
				!Number.isInteger(profileId) ||
				profileId <= 0 ||
				excluded[profileId] ||
				!alias
			) {
				continue;
			}

			found[profileId] = { profileId, alias };
		}
	}

	return Object.values(found);
}

function prioritizeSnowballCandidates(candidates, limit) {
	const scored = [];

	for (const candidate of candidates) {
		const record = ratings.findByProfileId(candidate.profileId);
		const harvestedAt = record?.get('harvestedAt') || '';
		const slots = record ? ratings.countEloSlots(record.get('elo')) : 0;
		let priority = 0;

		if (!record) {
			priority = 0;
		} else if (!harvestedAt) {
			priority = 1;
		} else {
			priority = 2;
		}

		scored.push({
			profileId: candidate.profileId,
			priority,
			slots
		});
	}

	scored.sort((a, b) => {
		if (a.priority !== b.priority) {
			return a.priority - b.priority;
		}

		return a.slots - b.slots;
	});

	return scored.slice(0, limit);
}

function runSnowball(allMatches, excludeProfileIds) {
	const candidates = collectTeammateProfileIds(allMatches, excludeProfileIds);
	const picked = prioritizeSnowballCandidates(candidates, SNOWBALL_BATCH_SIZE);

	if (picked.length === 0) {
		return { processed: 0, fetched: 0, updated: 0, failed: 0 };
	}

	const urls = picked.map((player) => matchHistoryUrl(player.profileId));
	const byUrl = fetchMatchHistories(urls);

	let fetched = 0;
	let updated = 0;
	let failed = 0;

	for (const player of picked) {
		const url = matchHistoryUrl(player.profileId);
		const payload = byUrl[url];
		if (payload?.ok) {
			fetched += 1;
		}

		const result = harvestProfileId(player.profileId, payload);
		updated += result.updated;
		failed += result.failed;
	}

	return {
		processed: picked.length,
		fetched,
		updated,
		failed
	};
}

function runBatch() {
	const players = selectDuePlayers();
	if (players.length === 0) {
		return {
			processed: 0,
			fetched: 0,
			updated: 0,
			failed: 0,
			snowball: { processed: 0, fetched: 0, updated: 0, failed: 0 }
		};
	}

	const urls = players.map((player) => matchHistoryUrl(player.profileId));
	const byUrl = fetchMatchHistories(urls);

	let fetched = 0;
	let updated = 0;
	let failed = 0;
	const allMatches = [];
	const excludeProfileIds = [];

	for (const player of players) {
		excludeProfileIds.push(player.profileId);

		const url = matchHistoryUrl(player.profileId);
		const payload = byUrl[url];
		if (payload?.ok) {
			fetched += 1;
		}

		const result = harvestPlayer(player, payload);
		updated += result.updated;
		failed += result.failed;

		if (result.matches?.length) {
			for (const match of result.matches) {
				allMatches.push(match);
			}
		}
	}

	const snowball = runSnowball(allMatches, excludeProfileIds);

	return {
		processed: players.length,
		fetched,
		updated,
		failed,
		snowball
	};
}

module.exports = {
	HARVEST_BATCH_SIZE,
	SNOWBALL_BATCH_SIZE,
	runBatch
};
