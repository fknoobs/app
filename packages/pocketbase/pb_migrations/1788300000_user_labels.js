/// <reference path="../pb_data/types.d.ts" />

migrate(
	(app) => {
		const admin = '@request.auth.role = "admin"';
		const authed = '@request.auth.id != ""';

		let labels;
		try {
			labels = app.findCollectionByNameOrId('user_labels');
		} catch {
			labels = new Collection({
				createRule: admin,
				deleteRule: admin,
				listRule: authed,
				viewRule: authed,
				updateRule: admin,
				name: 'user_labels',
				type: 'base',
				indexes: ['CREATE UNIQUE INDEX `idx_user_labels_name` ON `user_labels` (`name`)'],
				fields: [
					{
						autogeneratePattern: '[a-z0-9]{15}',
						hidden: false,
						id: 'text_user_labels_id',
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
						id: 'text_user_labels_name',
						max: 40,
						min: 1,
						name: 'name',
						pattern: '',
						presentable: true,
						primaryKey: false,
						required: true,
						system: false,
						type: 'text'
					},
					{
						autogeneratePattern: '',
						hidden: false,
						id: 'text_user_labels_color',
						max: 7,
						min: 4,
						name: 'color',
						pattern: '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$',
						presentable: true,
						primaryKey: false,
						required: true,
						system: false,
						type: 'text'
					},
					{
						hidden: false,
						id: 'number_user_labels_sort',
						max: null,
						min: 0,
						name: 'sort',
						onlyInt: true,
						presentable: false,
						required: false,
						system: false,
						type: 'number'
					},
					{
						hidden: false,
						id: 'autodate_user_labels_created',
						name: 'created',
						onCreate: true,
						onUpdate: false,
						presentable: false,
						system: false,
						type: 'autodate'
					},
					{
						hidden: false,
						id: 'autodate_user_labels_updated',
						name: 'updated',
						onCreate: true,
						onUpdate: true,
						presentable: false,
						system: false,
						type: 'autodate'
					}
				]
			});
			app.save(labels);
			labels = app.findCollectionByNameOrId('user_labels');
		}

		try {
			app.findCollectionByNameOrId('user_label_assignments');
			return;
		} catch {
			// create below
		}

		const assignments = new Collection({
			createRule: admin,
			deleteRule: admin,
			listRule: authed,
			viewRule: authed,
			updateRule: null,
			name: 'user_label_assignments',
			type: 'base',
			indexes: [
				'CREATE UNIQUE INDEX `idx_user_label_assignments_user_label` ON `user_label_assignments` (`user`, `label`)',
				'CREATE INDEX `idx_user_label_assignments_user` ON `user_label_assignments` (`user`)'
			],
			fields: [
				{
					autogeneratePattern: '[a-z0-9]{15}',
					hidden: false,
					id: 'text_user_label_assignments_id',
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
					id: 'relation_user_label_assignments_user',
					maxSelect: 1,
					minSelect: 1,
					name: 'user',
					presentable: false,
					required: true,
					system: false,
					type: 'relation'
				},
				{
					cascadeDelete: true,
					collectionId: labels.id,
					hidden: false,
					id: 'relation_user_label_assignments_label',
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
					id: 'autodate_user_label_assignments_created',
					name: 'created',
					onCreate: true,
					onUpdate: false,
					presentable: false,
					system: false,
					type: 'autodate'
				},
				{
					hidden: false,
					id: 'autodate_user_label_assignments_updated',
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
			app.delete(app.findCollectionByNameOrId('user_label_assignments'));
		} catch {
			// already gone
		}
		try {
			app.delete(app.findCollectionByNameOrId('user_labels'));
		} catch {
			// already gone
		}
	}
);
