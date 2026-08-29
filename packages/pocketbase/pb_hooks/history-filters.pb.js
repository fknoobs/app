/// <reference path="../pb_data/types.d.ts" />

'use strict';

routerAdd('GET', '/api/history-players', (e) => {
	const query = e.request.url.query();
	const scope = query.get('scope') || 'user';
	const userId = query.get('userId') || '';
	const q = (query.get('q') || '').trim();
	const limit = Math.min(50, Math.max(1, parseInt(query.get('limit') || '20', 10) || 20));

	if (scope === 'user' && !userId) {
		return e.json(400, { message: 'userId required for user scope' });
	}

	const bindings = {
		like: `%${q}%`,
		limit
	};

	const searchClause =
		q.length === 0
			? '1 = 1'
			: `(p.alias LIKE {:like} OR CAST(p.profile_id AS TEXT) LIKE {:like})`;

	let sql;
	if (scope === 'community') {
		sql = `SELECT p.profile_id AS profile_id, COALESCE(p.alias, '') AS alias
       FROM players p
       WHERE ${searchClause}
       ORDER BY p.alias ASC, p.profile_id ASC
       LIMIT {:limit}`;
	} else {
		bindings.userId = userId;
		sql = `SELECT DISTINCT p.profile_id AS profile_id, COALESCE(p.alias, '') AS alias
       FROM players p
       INNER JOIN lobby_player_index i ON i.profile_id = p.profile_id
       INNER JOIN lobbies l ON l.id = i.lobby
       WHERE l.user = {:userId}
         AND l.needsResult = 0
         AND l.title != 'Skirmish'
         AND ${searchClause}
       ORDER BY p.alias ASC, p.profile_id ASC
       LIMIT {:limit}`;
	}

	try {
		const rows = arrayOf(new DynamicModel({ profile_id: 0, alias: '' }));
		$app.db().newQuery(sql).bind(bindings).all(rows);
		return e.json(200, {
			items: rows.map((row) => ({
				profile_id: Number(row.profile_id),
				alias: row.alias || ''
			}))
		});
	} catch (error) {
		return e.json(400, { message: String(error?.message || error) });
	}
});

routerAdd('GET', '/api/history-maps', (e) => {
	const query = e.request.url.query();
	const scope = query.get('scope') || 'user';
	const userId = query.get('userId') || '';
	const q = (query.get('q') || '').trim();
	const limit = Math.min(200, Math.max(1, parseInt(query.get('limit') || '100', 10) || 100));

	if (scope === 'user' && !userId) {
		return e.json(400, { message: 'userId required for user scope' });
	}

	const bindings = {
		like: `%${q}%`,
		limit
	};

	const searchClause =
		q.length === 0 ? '1 = 1' : `(m.name LIKE {:like} OR m.map LIKE {:like})`;

	let sql;
	if (scope === 'community') {
		sql = `SELECT m.map AS map, COALESCE(NULLIF(m.name, ''), m.map) AS name
       FROM maps m
       WHERE ${searchClause}
       ORDER BY m.name ASC, m.map ASC
       LIMIT {:limit}`;
	} else {
		bindings.userId = userId;
		sql = `SELECT DISTINCT m.map AS map, COALESCE(NULLIF(m.name, ''), m.map) AS name
       FROM maps m
       INNER JOIN lobbies l ON l.map = m.map
       WHERE l.user = {:userId}
         AND l.needsResult = 0
         AND l.title != 'Skirmish'
         AND ${searchClause}
       ORDER BY m.name ASC, m.map ASC
       LIMIT {:limit}`;
	}

	try {
		const rows = arrayOf(new DynamicModel({ map: '', name: '' }));
		$app.db().newQuery(sql).bind(bindings).all(rows);

		if (rows.length === 0) {
			const fallbackBindings = { like: `%${q}%`, limit };
			let fallbackSql = `SELECT DISTINCT map AS map, map AS name
         FROM lobbies
         WHERE map IS NOT NULL AND map != ''
           AND needsResult = 0 AND title != 'Skirmish'`;
			if (scope === 'user') {
				fallbackBindings.userId = userId;
				fallbackSql += ' AND user = {:userId}';
			} else {
				fallbackSql += " AND (hasReplay = 1 OR (replay IS NOT NULL AND replay != ''))";
			}
			if (q.length > 0) {
				fallbackSql += ' AND map LIKE {:like}';
			}
			fallbackSql += ' ORDER BY map ASC LIMIT {:limit}';
			$app.db().newQuery(fallbackSql).bind(fallbackBindings).all(rows);
		}

		return e.json(200, {
			items: rows.map((row) => ({
				map: row.map,
				name: row.name || row.map
			}))
		});
	} catch (error) {
		return e.json(400, { message: String(error?.message || error) });
	}
});
