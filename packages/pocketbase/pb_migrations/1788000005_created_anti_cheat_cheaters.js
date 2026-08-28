/// <reference path="../pb_data/types.d.ts" />

migrate(
	(app) => {
		try {
			app.findCollectionByNameOrId('anti_cheat_cheaters');
			return;
		} catch {
			// create below
		}

		const staff = '@request.auth.role = "admin" || @request.auth.role = "moderator"';
		const authed = '@request.auth.id != ""';

		const collection = new Collection({
			createRule: staff,
			deleteRule: staff,
			listRule: authed,
			viewRule: authed,
			updateRule: staff,
			name: 'anti_cheat_cheaters',
			type: 'base',
			indexes: [
				'CREATE UNIQUE INDEX `idx_ac_cheaters_steam` ON `anti_cheat_cheaters` (`steam_id`)',
				'CREATE INDEX `idx_ac_cheaters_user` ON `anti_cheat_cheaters` (`user`)'
			],
			fields: [
				{
					autogeneratePattern: '[a-z0-9]{15}',
					hidden: false,
					id: 'text_ac_cheaters_id',
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
					cascadeDelete: true,
					collectionId: '_pb_users_auth_',
					hidden: false,
					id: 'relation_ac_cheaters_user',
					maxSelect: 1,
					minSelect: 1,
					name: 'user',
					presentable: false,
					required: true,
					system: false,
					type: 'relation'
				},
				{
					autogeneratePattern: '',
					hidden: false,
					id: 'text_ac_cheaters_steam_id',
					max: 32,
					min: 0,
					name: 'steam_id',
					pattern: '',
					presentable: true,
					primaryKey: false,
					required: true,
					system: false,
					type: 'text'
				},
				{
					cascadeDelete: false,
					collectionId: '_pb_users_auth_',
					hidden: false,
					id: 'relation_ac_cheaters_labeled_by',
					maxSelect: 1,
					minSelect: 0,
					name: 'labeled_by',
					presentable: false,
					required: false,
					system: false,
					type: 'relation'
				},
				{
					hidden: false,
					id: 'autodate_ac_cheaters_created',
					name: 'created',
					onCreate: true,
					onUpdate: false,
					presentable: false,
					system: false,
					type: 'autodate'
				},
				{
					hidden: false,
					id: 'autodate_ac_cheaters_updated',
					name: 'updated',
					onCreate: true,
					onUpdate: true,
					presentable: false,
					system: false,
					type: 'autodate'
				}
			]
		});

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId('anti_cheat_cheaters');
		return app.delete(collection);
	}
);
