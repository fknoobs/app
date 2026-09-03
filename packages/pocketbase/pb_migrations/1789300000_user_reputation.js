/// <reference path="../pb_data/types.d.ts" />

migrate(
	(app) => {
		const admin = '@request.auth.role = "admin"';
		const triggers = [
			'comment_created',
			'comment_received_upvote',
			'comment_received_downvote',
			'comment_cast_upvote',
			'comment_cast_downvote',
			'replay_received_upvote',
			'replay_received_downvote',
			'replay_cast_upvote',
			'replay_cast_downvote',
			'replay_received_download',
			'replay_cast_download',
			'match_played'
		];
		const seeds = [
			{ trigger: 'comment_created', name: 'Placed a comment', score: 10, sort: 0 },
			{ trigger: 'comment_received_upvote', name: 'Comment upvoted', score: 5, sort: 1 },
			{ trigger: 'comment_received_downvote', name: 'Comment downvoted', score: -10, sort: 2 },
			{ trigger: 'comment_cast_upvote', name: 'Upvoted a comment', score: 1, sort: 3 },
			{ trigger: 'comment_cast_downvote', name: 'Downvoted a comment', score: 1, sort: 4 },
			{ trigger: 'replay_received_upvote', name: 'Replay upvoted', score: 10, sort: 5 },
			{ trigger: 'replay_received_downvote', name: 'Replay downvoted', score: -5, sort: 6 },
			{ trigger: 'replay_cast_upvote', name: 'Upvoted a replay', score: 1, sort: 7 },
			{ trigger: 'replay_cast_downvote', name: 'Downvoted a replay', score: 1, sort: 8 },
			{ trigger: 'replay_received_download', name: 'Replay downloaded', score: 5, sort: 9 },
			{ trigger: 'replay_cast_download', name: 'Downloaded a replay', score: 2, sort: 10 },
			{ trigger: 'match_played', name: 'Played a match', score: 15, sort: 11 }
		];

		let types;
		try {
			types = app.findCollectionByNameOrId('reputation_types');
		} catch {
			types = new Collection({
				createRule: admin,
				deleteRule: null,
				listRule: admin,
				viewRule: admin,
				updateRule: admin,
				name: 'reputation_types',
				type: 'base',
				indexes: [
					'CREATE UNIQUE INDEX `idx_reputation_types_trigger` ON `reputation_types` (`trigger`)'
				],
				fields: [
					{
						autogeneratePattern: '[a-z0-9]{15}',
						hidden: false,
						id: 'text_reputation_types_id',
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
						id: 'select_reputation_types_trigger',
						maxSelect: 1,
						name: 'trigger',
						presentable: true,
						required: true,
						system: false,
						type: 'select',
						values: triggers
					},
					{
						autogeneratePattern: '',
						hidden: false,
						id: 'text_reputation_types_name',
						max: 80,
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
						hidden: false,
						id: 'number_reputation_types_score',
						max: null,
						min: null,
						name: 'score',
						onlyInt: true,
						presentable: false,
						required: true,
						system: false,
						type: 'number'
					},
					{
						hidden: false,
						id: 'bool_reputation_types_enabled',
						name: 'enabled',
						presentable: false,
						required: false,
						system: false,
						type: 'bool'
					},
					{
						hidden: false,
						id: 'number_reputation_types_sort',
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
						id: 'autodate_reputation_types_created',
						name: 'created',
						onCreate: true,
						onUpdate: false,
						presentable: false,
						system: false,
						type: 'autodate'
					},
					{
						hidden: false,
						id: 'autodate_reputation_types_updated',
						name: 'updated',
						onCreate: true,
						onUpdate: true,
						presentable: false,
						system: false,
						type: 'autodate'
					}
				]
			});
			app.save(types);
			types = app.findCollectionByNameOrId('reputation_types');
		}

		if (types.createRule !== admin) {
			types.createRule = admin;
			app.save(types);
		}

		for (const seed of seeds) {
			try {
				app.findFirstRecordByFilter('reputation_types', 'trigger = {:trigger}', {
					trigger: seed.trigger
				});
			} catch {
				const record = new Record(types);
				record.set('trigger', seed.trigger);
				record.set('name', seed.name);
				record.set('score', seed.score);
				record.set('enabled', true);
				record.set('sort', seed.sort);
				app.save(record);
			}
		}

		try {
			app.findCollectionByNameOrId('user_reputation');
		} catch {
			const ledger = new Collection({
				createRule: null,
				deleteRule: null,
				listRule: null,
				viewRule: null,
				updateRule: null,
				name: 'user_reputation',
				type: 'base',
				indexes: [
					'CREATE UNIQUE INDEX `idx_user_reputation_user_type_source` ON `user_reputation` (`user`, `type`, `source`)',
					'CREATE INDEX `idx_user_reputation_user` ON `user_reputation` (`user`)',
					'CREATE INDEX `idx_user_reputation_type` ON `user_reputation` (`type`)'
				],
				fields: [
					{
						autogeneratePattern: '[a-z0-9]{15}',
						hidden: false,
						id: 'text_user_reputation_id',
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
						id: 'relation_user_reputation_user',
						maxSelect: 1,
						minSelect: 1,
						name: 'user',
						presentable: false,
						required: true,
						system: false,
						type: 'relation'
					},
					{
						cascadeDelete: false,
						collectionId: types.id,
						hidden: false,
						id: 'relation_user_reputation_type',
						maxSelect: 1,
						minSelect: 1,
						name: 'type',
						presentable: false,
						required: true,
						system: false,
						type: 'relation'
					},
					{
						hidden: false,
						id: 'number_user_reputation_amount',
						max: null,
						min: null,
						name: 'amount',
						onlyInt: true,
						presentable: false,
						required: true,
						system: false,
						type: 'number'
					},
					{
						autogeneratePattern: '',
						hidden: false,
						id: 'text_user_reputation_source',
						max: 32,
						min: 1,
						name: 'source',
						pattern: '',
						presentable: false,
						primaryKey: false,
						required: true,
						system: false,
						type: 'text'
					},
					{
						hidden: false,
						id: 'autodate_user_reputation_created',
						name: 'created',
						onCreate: true,
						onUpdate: false,
						presentable: false,
						system: false,
						type: 'autodate'
					},
					{
						hidden: false,
						id: 'autodate_user_reputation_updated',
						name: 'updated',
						onCreate: true,
						onUpdate: true,
						presentable: false,
						system: false,
						type: 'autodate'
					}
				]
			});
			app.save(ledger);
		}

		try {
			app.findCollectionByNameOrId('user_reputation_totals');
		} catch {
			const totals = new Collection({
				createRule: null,
				deleteRule: null,
				listRule: null,
				viewRule: null,
				updateRule: null,
				name: 'user_reputation_totals',
				type: 'base',
				indexes: [
					'CREATE UNIQUE INDEX `idx_user_reputation_totals_user_type` ON `user_reputation_totals` (`user`, `type`)',
					'CREATE INDEX `idx_user_reputation_totals_user` ON `user_reputation_totals` (`user`)'
				],
				fields: [
					{
						autogeneratePattern: '[a-z0-9]{15}',
						hidden: false,
						id: 'text_user_reputation_totals_id',
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
						id: 'relation_user_reputation_totals_user',
						maxSelect: 1,
						minSelect: 1,
						name: 'user',
						presentable: false,
						required: true,
						system: false,
						type: 'relation'
					},
					{
						cascadeDelete: false,
						collectionId: types.id,
						hidden: false,
						id: 'relation_user_reputation_totals_type',
						maxSelect: 1,
						minSelect: 1,
						name: 'type',
						presentable: false,
						required: true,
						system: false,
						type: 'relation'
					},
					{
						hidden: false,
						id: 'number_user_reputation_totals_total',
						max: null,
						min: null,
						name: 'total',
						onlyInt: true,
						presentable: false,
						required: true,
						system: false,
						type: 'number'
					},
					{
						hidden: false,
						id: 'autodate_user_reputation_totals_created',
						name: 'created',
						onCreate: true,
						onUpdate: false,
						presentable: false,
						system: false,
						type: 'autodate'
					},
					{
						hidden: false,
						id: 'autodate_user_reputation_totals_updated',
						name: 'updated',
						onCreate: true,
						onUpdate: true,
						presentable: false,
						system: false,
						type: 'autodate'
					}
				]
			});
			app.save(totals);
		}

		const users = app.findCollectionByNameOrId('_pb_users_auth_');
		if (!users.fields.getByName('reputation')) {
			users.fields.add(
				new NumberField({
					hidden: false,
					id: 'number_users_reputation',
					max: null,
					min: null,
					name: 'reputation',
					onlyInt: true,
					presentable: false,
					required: false,
					system: false
				})
			);
		}

		users.updateRule =
			'id = @request.auth.id && @request.body.role:changed = false && @request.body.reputation:changed = false';
		app.save(users);
	},
	(app) => {
		try {
			app.delete(app.findCollectionByNameOrId('user_reputation_totals'));
		} catch {
			// already gone
		}

		try {
			app.delete(app.findCollectionByNameOrId('user_reputation'));
		} catch {
			// already gone
		}

		try {
			app.delete(app.findCollectionByNameOrId('reputation_types'));
		} catch {
			// already gone
		}

		try {
			const users = app.findCollectionByNameOrId('_pb_users_auth_');
			if (users.fields.getByName('reputation')) {
				users.fields.removeByName('reputation');
			}

			users.updateRule = 'id = @request.auth.id && @request.body.role:changed = false';
			app.save(users);
		} catch {
			// already gone
		}
	}
);
