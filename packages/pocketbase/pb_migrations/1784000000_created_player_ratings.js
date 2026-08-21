/// <reference path="../pb_data/types.d.ts" />

migrate(
	(app) => {
		try {
			app.findCollectionByNameOrId('player_ratings');
			return;
		} catch {
			// create below
		}

		const collection = new Collection({
			createRule: null,
			deleteRule: null,
			listRule: '',
			viewRule: '',
			updateRule: null,
			name: 'player_ratings',
			type: 'base',
			fields: [
				{
					autogeneratePattern: '[a-z0-9]{15}',
					hidden: false,
					id: 'text_player_ratings_id',
					max: 15,
					min: 15,
					name: 'id',
					pattern: '^[a-z0-9]+$',
					presentable: false,
					primaryKey: true,
					required: true,
					system: true,
					type: 'text'
				},
				{
					autogeneratePattern: '',
					hidden: false,
					id: 'text_player_ratings_steam_id',
					max: 20,
					min: 17,
					name: 'steamId',
					pattern: '^[0-9]+$',
					presentable: true,
					primaryKey: false,
					required: true,
					system: false,
					type: 'text'
				},
				{
					hidden: false,
					id: 'number_player_ratings_profile_id',
					max: null,
					min: 1,
					name: 'profileId',
					onlyInt: true,
					presentable: false,
					required: true,
					system: false,
					type: 'number'
				},
				{
					autogeneratePattern: '',
					hidden: false,
					id: 'text_player_ratings_alias',
					max: 255,
					min: 1,
					name: 'alias',
					pattern: '',
					presentable: true,
					primaryKey: false,
					required: true,
					system: false,
					type: 'text'
				},
				{
					hidden: false,
					id: 'json_player_ratings_elo',
					maxSize: 200000,
					name: 'elo',
					presentable: false,
					required: false,
					system: false,
					type: 'json'
				},
				{
					hidden: false,
					id: 'autodate_player_ratings_created',
					name: 'created',
					onCreate: true,
					onUpdate: false,
					presentable: false,
					system: false,
					type: 'autodate'
				},
				{
					hidden: false,
					id: 'autodate_player_ratings_updated',
					name: 'updated',
					onCreate: true,
					onUpdate: true,
					presentable: false,
					system: false,
					type: 'autodate'
				}
			],
			indexes: [
				'CREATE UNIQUE INDEX `idx_player_ratings_steam_id` ON `player_ratings` (`steamId`)',
				'CREATE INDEX `idx_player_ratings_profile_id` ON `player_ratings` (`profileId`)'
			]
		});

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId('player_ratings');
		return app.delete(collection);
	}
);
