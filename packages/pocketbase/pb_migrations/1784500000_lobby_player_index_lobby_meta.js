/// <reference path="../pb_data/types.d.ts" />

// The performance aggregation used to join `lobbies`, which costs seconds
// because those rows are huge. Denormalizing the few lobby columns it filters
// and groups on lets the whole query stay inside this small table.
const NEW_FIELDS = [
	{
		hidden: false,
		id: 'number_lobby_player_index_session',
		max: null,
		min: null,
		name: 'session_id',
		onlyInt: true,
		presentable: false,
		required: false,
		system: false,
		type: 'number'
	},
	{
		autogeneratePattern: '',
		hidden: false,
		id: 'text_lobby_player_index_map',
		max: 255,
		min: 0,
		name: 'map',
		pattern: '',
		presentable: false,
		primaryKey: false,
		required: false,
		system: false,
		type: 'text'
	},
	{
		autogeneratePattern: '',
		hidden: false,
		id: 'text_lobby_player_index_user',
		max: 50,
		min: 0,
		name: 'lobby_user',
		pattern: '',
		presentable: false,
		primaryKey: false,
		required: false,
		system: false,
		type: 'text'
	},
	{
		hidden: false,
		id: 'bool_lobby_player_index_counts',
		name: 'counts',
		presentable: false,
		required: false,
		system: false,
		type: 'bool'
	}
];

const NEW_INDEXES = [
	'CREATE INDEX `idx_lpi_user_steam_outcome` ON `lobby_player_index` (`lobby_user`, `steam_id`, `outcome`)',
	'CREATE INDEX `idx_lpi_profile_outcome` ON `lobby_player_index` (`profile_id`, `outcome`)',
	'CREATE INDEX `idx_lpi_session` ON `lobby_player_index` (`session_id`)'
];

const BACKFILL_SQL = `UPDATE lobby_player_index
SET
	session_id = s.sessionId,
	map = s.map,
	lobby_user = s.user,
	counts = s.counts
FROM (
	SELECT
		l.id AS lobby_id,
		l.sessionId AS sessionId,
		COALESCE(l.map, '') AS map,
		COALESCE(l.user, '') AS user,
		CASE WHEN l.needsResult = 0 AND l.title != 'Skirmish' THEN 1 ELSE 0 END AS counts
	FROM lobbies l
) AS s
WHERE lobby_player_index.lobby = s.lobby_id`;

migrate(
	(app) => {
		let collection;
		try {
			collection = app.findCollectionByNameOrId('lobby_player_index');
		} catch {
			return;
		}

		for (const config of NEW_FIELDS) {
			if (!collection.fields.getByName(config.name)) {
				collection.fields.add(new Field(config));
			}
		}

		const indexes = [];
		for (const index of collection.indexes) {
			indexes.push(String(index));
		}
		for (const index of NEW_INDEXES) {
			const name = index.split('`')[1];
			if (!indexes.some((existing) => existing.includes(name))) {
				indexes.push(index);
			}
		}
		collection.indexes = indexes;

		app.save(collection);
		app.db().newQuery(BACKFILL_SQL).execute();
	},
	(app) => {
		let collection;
		try {
			collection = app.findCollectionByNameOrId('lobby_player_index');
		} catch {
			return;
		}

		for (const config of NEW_FIELDS) {
			if (collection.fields.getByName(config.name)) {
				collection.fields.removeByName(config.name);
			}
		}

		const indexes = [];
		for (const index of collection.indexes) {
			const text = String(index);
			if (!NEW_INDEXES.some((candidate) => text.includes(candidate.split('`')[1]))) {
				indexes.push(text);
			}
		}
		collection.indexes = indexes;

		return app.save(collection);
	}
);
