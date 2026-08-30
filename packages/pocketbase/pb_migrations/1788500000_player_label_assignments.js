/// <reference path="../pb_data/types.d.ts" />

migrate(
	(app) => {
		try {
			app.delete(app.findCollectionByNameOrId('user_label_assignments'));
		} catch {
			// already gone
		}

		try {
			app.findCollectionByNameOrId('player_label_assignments');
			return;
		} catch {
			// create below
		}

		let labels;
		try {
			labels = app.findCollectionByNameOrId('user_labels');
		} catch {
			return;
		}

		const admin = '@request.auth.role = "admin"';
		const authed = '@request.auth.id != ""';

		const assignments = new Collection({
			createRule: admin,
			deleteRule: admin,
			listRule: authed,
			viewRule: authed,
			updateRule: null,
			name: 'player_label_assignments',
			type: 'base',
			indexes: [
				'CREATE UNIQUE INDEX `idx_player_label_assignments_steam_label` ON `player_label_assignments` (`steamId`, `label`)',
				'CREATE INDEX `idx_player_label_assignments_steam` ON `player_label_assignments` (`steamId`)',
				'CREATE INDEX `idx_player_label_assignments_profile` ON `player_label_assignments` (`profileId`)'
			],
			fields: [
				{
					autogeneratePattern: '[a-z0-9]{15}',
					hidden: false,
					id: 'text_player_label_assignments_id',
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
					id: 'text_player_label_assignments_steam',
					max: 32,
					min: 1,
					name: 'steamId',
					pattern: '',
					presentable: false,
					primaryKey: false,
					required: true,
					system: false,
					type: 'text'
				},
				{
					hidden: false,
					id: 'number_player_label_assignments_profile',
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
					id: 'text_player_label_assignments_alias',
					max: 80,
					min: 0,
					name: 'alias',
					pattern: '',
					presentable: true,
					primaryKey: false,
					required: false,
					system: false,
					type: 'text'
				},
				{
					cascadeDelete: true,
					collectionId: labels.id,
					hidden: false,
					id: 'relation_player_label_assignments_label',
					maxSelect: 1,
					minSelect: 1,
					name: 'label',
					presentable: false,
					required: true,
					system: false,
					type: 'relation'
				},
				{
					hidden: false,
					id: 'autodate_player_label_assignments_created',
					name: 'created',
					onCreate: true,
					onUpdate: false,
					presentable: false,
					system: false,
					type: 'autodate'
				},
				{
					hidden: false,
					id: 'autodate_player_label_assignments_updated',
					name: 'updated',
					onCreate: true,
					onUpdate: true,
					presentable: false,
					system: false,
					type: 'autodate'
				}
			]
		});

		return app.save(assignments);
	},
	(app) => {
		try {
			app.delete(app.findCollectionByNameOrId('player_label_assignments'));
		} catch {
			// already gone
		}
	}
);
