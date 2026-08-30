/// <reference path="../pb_data/types.d.ts" />

'use strict';

routerAdd('GET', '/api/match-filters/{scope}', (e) => {
	const {
		parseJsonArray,
		playersNeedRebuild,
		buildUserMatchFilters,
		saveUserMatchFiltersSnapshot
	} = require(`${__hooks}/lib/match-filters.js`);

	const scope = e.request.pathValue('scope');
	const userId = e.request.url.query().get('userId');

	try {
		if (scope === 'community') {
			const snapshot = $app.findRecordById('match_filter_snapshots', 'community');
			const maps = parseJsonArray(snapshot.get('maps'));
			const players = parseJsonArray(snapshot.get('players'));

			return e.json(200, { maps, players });
		}

		if (scope === 'user') {
			if (!userId) {
				return e.json(400, { message: 'userId required for user scope' });
			}

			const snapshotId = `user-v2:${userId}`;

			try {
				const snapshot = $app.findRecordById('match_filter_snapshots', snapshotId);
				const maps = parseJsonArray(snapshot.get('maps'));
				const players = parseJsonArray(snapshot.get('players'));

				if (!playersNeedRebuild(players)) {
					return e.json(200, { maps, players });
				}
			} catch {
				// Build and cache the first user snapshot below.
			}

			const { maps, players } = buildUserMatchFilters(userId);
			saveUserMatchFiltersSnapshot(snapshotId, maps, players);

			return e.json(200, { maps, players });
		}

		return e.json(400, { message: 'invalid scope' });
	} catch (error) {
		return e.json(400, { message: String(error?.message || error) });
	}
});

routerAdd('GET', '/api/replay-filters', (e) => {
	const userId = e.request.url.query().get('userId');

	if (!userId) {
		return e.json(400, { message: 'userId required' });
	}

	try {
		const bindings = { userId };

		const mapRows = arrayOf(new DynamicModel({ value: '' }));
		$app
			.db()
			.newQuery(
				`SELECT DISTINCT mapName AS value
         FROM replays
         WHERE createdBy = {:userId}
           AND mapName IS NOT NULL
           AND mapName != ''
         ORDER BY value`
			)
			.bind(bindings)
			.all(mapRows);

		const playerRows = arrayOf(new DynamicModel({ value: '' }));
		$app
			.db()
			.newQuery(
				`SELECT DISTINCT json_extract(player.value, '$.name') AS value
         FROM replays r, json_each(r.players) AS player
         WHERE r.createdBy = {:userId}
           AND json_extract(player.value, '$.name') IS NOT NULL
           AND json_extract(player.value, '$.name') != ''`
			)
			.bind(bindings)
			.all(playerRows);

		return e.json(200, {
			maps: mapRows.map((row) => row.value),
			players: playerRows.map((row) => ({ name: row.value }))
		});
	} catch (error) {
		return e.json(400, { message: String(error?.message || error) });
	}
});
