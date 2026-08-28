/// <reference path="../pb_data/types.d.ts" />

migrate(
	(app) => {
		try {
			app.findCollectionByNameOrId('anti_cheat_captures');
			return;
		} catch {
			// create below
		}

		const staff = '@request.auth.role = "admin" || @request.auth.role = "moderator"';
		const ownOrStaff = `user = @request.auth.id || ${staff}`;

		const collection = new Collection({
			createRule:
				'@request.auth.id != "" && @request.body.user = @request.auth.id && (@request.body.analysis_status:isset = false || @request.body.analysis_status = "pending")',
			deleteRule: staff,
			listRule: ownOrStaff,
			viewRule: ownOrStaff,
			updateRule: staff,
			name: 'anti_cheat_captures',
			type: 'base',
			fields: [
				{
					autogeneratePattern: '[a-z0-9]{15}',
					hidden: false,
					id: 'text_ac_captures_id',
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
					id: 'relation_ac_captures_user',
					maxSelect: 1,
					minSelect: 1,
					name: 'user',
					presentable: false,
					required: true,
					system: false,
					type: 'relation'
				},
				{
					hidden: false,
					id: 'number_ac_captures_session_id',
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
					id: 'text_ac_captures_map',
					max: 120,
					min: 0,
					name: 'map',
					pattern: '',
					presentable: true,
					primaryKey: false,
					required: false,
					system: false,
					type: 'text'
				},
				{
					hidden: false,
					id: 'bool_ac_captures_game_focused',
					name: 'game_focused',
					presentable: false,
					required: false,
					system: false,
					type: 'bool'
				},
				{
					hidden: false,
					id: 'date_ac_captures_captured_at',
					max: '',
					min: '',
					name: 'captured_at',
					presentable: false,
					required: false,
					system: false,
					type: 'date'
				},
				{
					hidden: false,
					id: 'file_ac_captures_image',
					maxSelect: 1,
					maxSize: 2097152,
					mimeTypes: ['image/jpeg'],
					name: 'image',
					presentable: false,
					protected: true,
					required: true,
					system: false,
					thumbs: ['400x0'],
					type: 'file'
				},
				{
					hidden: false,
					id: 'select_ac_captures_analysis_status',
					maxSelect: 1,
					name: 'analysis_status',
					presentable: true,
					required: true,
					system: false,
					type: 'select',
					values: ['pending', 'skipped', 'clean', 'flagged', 'error']
				},
				{
					hidden: false,
					id: 'number_ac_captures_analysis_score',
					max: null,
					min: null,
					name: 'analysis_score',
					onlyInt: false,
					presentable: false,
					required: false,
					system: false,
					type: 'number'
				},
				{
					hidden: false,
					id: 'json_ac_captures_analysis_notes',
					maxSize: 200000,
					name: 'analysis_notes',
					presentable: false,
					required: false,
					system: false,
					type: 'json'
				},
				{
					hidden: false,
					id: 'autodate_ac_captures_created',
					name: 'created',
					onCreate: true,
					onUpdate: false,
					presentable: false,
					system: false,
					type: 'autodate'
				},
				{
					hidden: false,
					id: 'autodate_ac_captures_updated',
					name: 'updated',
					onCreate: true,
					onUpdate: true,
					presentable: false,
					system: false,
					type: 'autodate'
				}
			],
			indexes: [
				'CREATE INDEX `idx_ac_captures_status` ON `anti_cheat_captures` (`analysis_status`, `captured_at`)',
				'CREATE INDEX `idx_ac_captures_user_session` ON `anti_cheat_captures` (`user`, `session_id`)'
			]
		});

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId('anti_cheat_captures');
		return app.delete(collection);
	}
);
