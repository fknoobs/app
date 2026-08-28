/// <reference path="../pb_data/types.d.ts" />

migrate(
	(app) => {
		try {
			app.findCollectionByNameOrId('anti_cheat_reports');
			return;
		} catch {
			// create below
		}

		const staff = '@request.auth.role = "admin" || @request.auth.role = "moderator"';
		const authed = '@request.auth.id != ""';

		const collection = new Collection({
			createRule: `${authed} && @request.body.reporter = @request.auth.id && @request.body.accused != @request.auth.id`,
			deleteRule: staff,
			listRule: `${staff} || reporter = @request.auth.id`,
			viewRule: `${staff} || reporter = @request.auth.id`,
			updateRule: staff,
			name: 'anti_cheat_reports',
			type: 'base',
			indexes: [
				'CREATE UNIQUE INDEX `idx_ac_reports_reporter_accused_session` ON `anti_cheat_reports` (`reporter`, `accused`, `session_id`)',
				'CREATE INDEX `idx_ac_reports_status` ON `anti_cheat_reports` (`status`, `created`)',
				'CREATE INDEX `idx_ac_reports_accused` ON `anti_cheat_reports` (`accused`)'
			],
			fields: [
				{
					autogeneratePattern: '[a-z0-9]{15}',
					hidden: false,
					id: 'text_ac_reports_id',
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
					id: 'relation_ac_reports_reporter',
					maxSelect: 1,
					minSelect: 1,
					name: 'reporter',
					presentable: false,
					required: true,
					system: false,
					type: 'relation'
				},
				{
					cascadeDelete: true,
					collectionId: '_pb_users_auth_',
					hidden: false,
					id: 'relation_ac_reports_accused',
					maxSelect: 1,
					minSelect: 1,
					name: 'accused',
					presentable: false,
					required: true,
					system: false,
					type: 'relation'
				},
				{
					hidden: false,
					id: 'number_ac_reports_session_id',
					max: null,
					min: null,
					name: 'session_id',
					onlyInt: true,
					presentable: false,
					required: true,
					system: false,
					type: 'number'
				},
				{
					cascadeDelete: false,
					collectionId: 'pbc_1574334436',
					hidden: false,
					id: 'relation_ac_reports_lobby',
					maxSelect: 1,
					minSelect: 0,
					name: 'lobby',
					presentable: false,
					required: false,
					system: false,
					type: 'relation'
				},
				{
					autogeneratePattern: '',
					hidden: false,
					id: 'text_ac_reports_accused_steam_id',
					max: 32,
					min: 0,
					name: 'accused_steam_id',
					pattern: '',
					presentable: true,
					primaryKey: false,
					required: false,
					system: false,
					type: 'text'
				},
				{
					autogeneratePattern: '',
					hidden: false,
					id: 'text_ac_reports_note',
					max: 500,
					min: 0,
					name: 'note',
					pattern: '',
					presentable: false,
					primaryKey: false,
					required: false,
					system: false,
					type: 'text'
				},
				{
					hidden: false,
					id: 'select_ac_reports_status',
					maxSelect: 1,
					name: 'status',
					presentable: true,
					required: true,
					system: false,
					type: 'select',
					values: ['pending', 'dismissed', 'confirmed']
				},
				{
					hidden: false,
					id: 'autodate_ac_reports_created',
					name: 'created',
					onCreate: true,
					onUpdate: false,
					presentable: false,
					system: false,
					type: 'autodate'
				},
				{
					hidden: false,
					id: 'autodate_ac_reports_updated',
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
		const collection = app.findCollectionByNameOrId('anti_cheat_reports');
		return app.delete(collection);
	}
);
