/// <reference path="../pb_data/types.d.ts" />

migrate(
	(app) => {
		try {
			app.findCollectionByNameOrId('hidden_matches');
			return;
		} catch {
			// create below
		}

		const staff = '@request.auth.role = "admin" || @request.auth.role = "moderator"';

		const collection = new Collection({
			createRule: staff,
			deleteRule: staff,
			listRule: '',
			viewRule: '',
			updateRule: staff,
			name: 'hidden_matches',
			type: 'base',
			indexes: [
				'CREATE UNIQUE INDEX `idx_hidden_matches_session` ON `hidden_matches` (`sessionId`)'
			],
			fields: [
				{
					autogeneratePattern: '[a-z0-9]{15}',
					hidden: false,
					id: 'text_hidden_matches_id',
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
					hidden: false,
					id: 'number_hidden_matches_session',
					max: null,
					min: 1,
					name: 'sessionId',
					onlyInt: true,
					presentable: true,
					required: true,
					system: false,
					type: 'number'
				},
				{
					cascadeDelete: false,
					collectionId: '_pb_users_auth_',
					hidden: false,
					id: 'relation_hidden_matches_hidden_by',
					maxSelect: 1,
					minSelect: 0,
					name: 'hiddenBy',
					presentable: false,
					required: false,
					system: false,
					type: 'relation'
				},
				{
					hidden: false,
					id: 'autodate_hidden_matches_created',
					name: 'created',
					onCreate: true,
					onUpdate: false,
					presentable: false,
					system: false,
					type: 'autodate'
				},
				{
					hidden: false,
					id: 'autodate_hidden_matches_updated',
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
		try {
			app.delete(app.findCollectionByNameOrId('hidden_matches'));
		} catch {
			// already gone
		}
	}
);
