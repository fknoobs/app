/// <reference path="../pb_data/types.d.ts" />

migrate(
	(app) => {
		try {
			app.findCollectionByNameOrId('player_likes');
		} catch {
			const likes = new Collection({
				createRule: '@request.auth.id != "" && @request.body.user = @request.auth.id',
				deleteRule: 'user = @request.auth.id',
				listRule: '',
				viewRule: '',
				updateRule: 'user = @request.auth.id',
				name: 'player_likes',
				type: 'base',
				id: 'pbc_5728193050',
				indexes: [
					'CREATE UNIQUE INDEX `idx_player_likes_steam_user` ON `player_likes` (`steamId`, `user`)',
					'CREATE INDEX `idx_player_likes_steam` ON `player_likes` (`steamId`)'
				],
				fields: [
					{
						autogeneratePattern: '[a-z0-9]{15}',
						hidden: false,
						id: 'text_player_likes_id',
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
						id: 'text_player_likes_steamId',
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
						cascadeDelete: true,
						collectionId: '_pb_users_auth_',
						hidden: false,
						id: 'relation_player_likes_user',
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
						id: 'number_player_likes_value',
						max: 1,
						min: -1,
						name: 'value',
						onlyInt: true,
						presentable: false,
						required: true,
						system: false,
						type: 'number'
					},
					{
						hidden: false,
						id: 'autodate_player_likes_created',
						name: 'created',
						onCreate: true,
						onUpdate: false,
						presentable: false,
						system: false,
						type: 'autodate'
					},
					{
						hidden: false,
						id: 'autodate_player_likes_updated',
						name: 'updated',
						onCreate: true,
						onUpdate: true,
						presentable: false,
						system: false,
						type: 'autodate'
					}
				]
			});
			app.save(likes);
		}

		try {
			app.findCollectionByNameOrId('player_vote_scores');
		} catch {
			const scores = new Collection({
				createRule: null,
				deleteRule: null,
				listRule: '',
				viewRule: '',
				updateRule: null,
				name: 'player_vote_scores',
				type: 'base',
				id: 'pbc_5728193051',
				indexes: [
					'CREATE UNIQUE INDEX `idx_player_vote_scores_steam` ON `player_vote_scores` (`steamId`)'
				],
				fields: [
					{
						autogeneratePattern: '[a-z0-9]{15}',
						hidden: false,
						id: 'text_player_vote_scores_id',
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
						id: 'text_player_vote_scores_steamId',
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
						id: 'number_player_vote_scores_likeCount',
						max: null,
						min: null,
						name: 'likeCount',
						onlyInt: true,
						presentable: false,
						required: false,
						system: false,
						type: 'number'
					},
					{
						hidden: false,
						id: 'autodate_player_vote_scores_created',
						name: 'created',
						onCreate: true,
						onUpdate: false,
						presentable: false,
						system: false,
						type: 'autodate'
					},
					{
						hidden: false,
						id: 'autodate_player_vote_scores_updated',
						name: 'updated',
						onCreate: true,
						onUpdate: true,
						presentable: false,
						system: false,
						type: 'autodate'
					}
				]
			});
			app.save(scores);
		}

		const playerTriggers = [
			'player_received_upvote',
			'player_received_downvote',
			'player_cast_upvote',
			'player_cast_downvote'
		];
		const seeds = [
			{ trigger: 'player_received_upvote', name: 'Player upvoted', score: 10, sort: 12 },
			{ trigger: 'player_received_downvote', name: 'Player downvoted', score: -5, sort: 13 },
			{ trigger: 'player_cast_upvote', name: 'Upvoted a player', score: 1, sort: 14 },
			{ trigger: 'player_cast_downvote', name: 'Downvoted a player', score: 1, sort: 15 }
		];

		try {
			const types = app.findCollectionByNameOrId('reputation_types');
			const triggerField = types.fields.getByName('trigger');
			if (triggerField && Array.isArray(triggerField.values)) {
				const next = [...triggerField.values];
				for (const trigger of playerTriggers) {
					if (!next.includes(trigger)) {
						next.push(trigger);
					}
				}
				triggerField.values = next;
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
		} catch {
			// reputation_types may not exist in partial envs
		}
	},
	(app) => {
		try {
			app.delete(app.findCollectionByNameOrId('player_likes'));
		} catch {
			// already gone
		}

		try {
			app.delete(app.findCollectionByNameOrId('player_vote_scores'));
		} catch {
			// already gone
		}

		try {
			const types = app.findCollectionByNameOrId('reputation_types');
			const remove = [
				'player_received_upvote',
				'player_received_downvote',
				'player_cast_upvote',
				'player_cast_downvote'
			];
			for (const trigger of remove) {
				try {
					const record = app.findFirstRecordByFilter('reputation_types', 'trigger = {:trigger}', {
						trigger
					});
					app.delete(record);
				} catch {
					// missing
				}
			}

			const triggerField = types.fields.getByName('trigger');
			if (triggerField && Array.isArray(triggerField.values)) {
				triggerField.values = triggerField.values.filter((value) => !remove.includes(value));
				app.save(types);
			}
		} catch {
			// already gone
		}
	}
);
