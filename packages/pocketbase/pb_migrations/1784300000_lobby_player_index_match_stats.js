/// <reference path="../pb_data/types.d.ts" />

const STEAM_INDEX =
	'CREATE INDEX `idx_lobby_player_index_steam` ON `lobby_player_index` (`steam_id`)';

const BACKFILL_SQL = `UPDATE lobby_player_index
SET
	steam_id = s.steam_id,
	outcome = s.outcome,
	race_id = s.race_id,
	matchtype_id = s.matchtype_id
FROM (
	SELECT
		i.id AS index_id,
		COALESCE(
			NULLIF(json_extract(p.value, '$.steamId'), ''),
			REPLACE(json_extract(p.value, '$.name'), '/steam/', '')
		) AS steam_id,
		CAST(json_extract(p.value, '$.outcome') AS INTEGER) AS outcome,
		CAST(json_extract(p.value, '$.race_id') AS INTEGER) AS race_id,
		CAST(json_extract(l.result, '$.matchtype_id') AS INTEGER) AS matchtype_id
	FROM lobby_player_index i
	JOIN lobbies l ON l.id = i.lobby
	JOIN json_each(
		CASE
			WHEN l.result IS NOT NULL AND l.result != ''
				AND json_valid(l.result)
				AND json_type(json_extract(l.result, '$.players')) = 'array'
			THEN json_extract(l.result, '$.players')
			ELSE '[]'
		END
	) AS p ON CAST(json_extract(p.value, '$.profile_id') AS INTEGER) = i.profile_id
	WHERE CAST(json_extract(p.value, '$.outcome') AS INTEGER) IN (0, 1)
) AS s
WHERE lobby_player_index.id = s.index_id`;

migrate(
	(app) => {
		let collection;
		try {
			collection = app.findCollectionByNameOrId('lobby_player_index');
		} catch {
			return;
		}

		const addField = (config) => {
			if (!collection.fields.getByName(config.name)) {
				collection.fields.add(new Field(config));
			}
		};

		addField({
			autogeneratePattern: '',
			hidden: false,
			id: 'text_lobby_player_index_steam',
			max: 32,
			min: 0,
			name: 'steam_id',
			pattern: '',
			presentable: false,
			primaryKey: false,
			required: false,
			system: false,
			type: 'text'
		});
		addField({
			hidden: false,
			id: 'number_lobby_player_index_outcome',
			max: null,
			min: null,
			name: 'outcome',
			onlyInt: true,
			presentable: false,
			required: false,
			system: false,
			type: 'number'
		});
		addField({
			hidden: false,
			id: 'number_lobby_player_index_race',
			max: null,
			min: null,
			name: 'race_id',
			onlyInt: true,
			presentable: false,
			required: false,
			system: false,
			type: 'number'
		});
		addField({
			hidden: false,
			id: 'number_lobby_player_index_matchtype',
			max: null,
			min: null,
			name: 'matchtype_id',
			onlyInt: true,
			presentable: false,
			required: false,
			system: false,
			type: 'number'
		});

		const indexes = [];
		for (const index of collection.indexes) {
			indexes.push(index);
		}
		if (!indexes.some((index) => String(index).includes('idx_lobby_player_index_steam'))) {
			indexes.push(STEAM_INDEX);
			collection.indexes = indexes;
		}

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

		['steam_id', 'outcome', 'race_id', 'matchtype_id'].forEach((name) => {
			if (collection.fields.getByName(name)) {
				collection.fields.removeByName(name);
			}
		});

		const indexes = [];
		for (const index of collection.indexes) {
			if (!String(index).includes('idx_lobby_player_index_steam')) {
				indexes.push(index);
			}
		}
		collection.indexes = indexes;
		return app.save(collection);
	}
);
