/// <reference path="../pb_data/types.d.ts" />

migrate(
	(app) => {
		try {
			app.findCollectionByNameOrId('hidden_match_keywords');
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
			name: 'hidden_match_keywords',
			type: 'base',
			indexes: [
				'CREATE UNIQUE INDEX `idx_hidden_match_keywords_word` ON `hidden_match_keywords` (`word`)'
			],
			fields: [
				{
					autogeneratePattern: '[a-z0-9]{15}',
					hidden: false,
					id: 'text_hidden_match_keywords_id',
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
					id: 'text_hidden_match_keywords_word',
					max: 64,
					min: 1,
					name: 'word',
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
					id: 'relation_hidden_match_keywords_created_by',
					maxSelect: 1,
					minSelect: 0,
					name: 'createdBy',
					presentable: false,
					required: false,
					system: false,
					type: 'relation'
				},
				{
					hidden: false,
					id: 'autodate_hidden_match_keywords_created',
					name: 'created',
					onCreate: true,
					onUpdate: false,
					presentable: false,
					system: false,
					type: 'autodate'
				},
				{
					hidden: false,
					id: 'autodate_hidden_match_keywords_updated',
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
			app.delete(app.findCollectionByNameOrId('hidden_match_keywords'));
		} catch {
			// already gone
		}
	}
);
