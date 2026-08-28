/// <reference path="../pb_data/types.d.ts" />

migrate(
	(app) => {
		let collection;
		try {
			collection = app.findCollectionByNameOrId('anti_cheat_captures');
		} catch {
			return;
		}

		const staff = '@request.auth.role = "admin" || @request.auth.role = "moderator"';
		const authed = '@request.auth.id != ""';

		collection.listRule = authed;
		collection.viewRule = authed;
		collection.updateRule = staff;
		collection.deleteRule = staff;
		collection.createRule = `${authed} && @request.body.user = @request.auth.id`;

		for (const name of ['analysis_status', 'analysis_score', 'analysis_notes']) {
			if (collection.fields.getByName(name)) {
				collection.fields.removeByName(name);
			}
		}

		if (!collection.fields.getByName('steam_id')) {
			collection.fields.add(
				new Field({
					autogeneratePattern: '',
					hidden: false,
					id: 'text_ac_captures_steam_id',
					max: 32,
					min: 0,
					name: 'steam_id',
					pattern: '',
					presentable: false,
					primaryKey: false,
					required: false,
					system: false,
					type: 'text'
				})
			);
		}

		const indexes = collection.indexes.filter(
			(index) =>
				!index.includes('idx_ac_captures_status') &&
				!index.includes('idx_ac_captures_session') &&
				!index.includes('idx_ac_captures_steam')
		);
		collection.indexes = [
			...indexes,
			'CREATE INDEX `idx_ac_captures_session` ON `anti_cheat_captures` (`session_id`)',
			'CREATE INDEX `idx_ac_captures_steam` ON `anti_cheat_captures` (`steam_id`, `captured_at`)'
		];

		return app.save(collection);
	},
	(app) => {
		let collection;
		try {
			collection = app.findCollectionByNameOrId('anti_cheat_captures');
		} catch {
			return;
		}

		const staff = '@request.auth.role = "admin" || @request.auth.role = "moderator"';
		const ownOrStaff = `user = @request.auth.id || ${staff}`;
		collection.listRule = ownOrStaff;
		collection.viewRule = ownOrStaff;
		collection.createRule =
			'@request.auth.id != "" && @request.body.user = @request.auth.id && (@request.body.analysis_status:isset = false || @request.body.analysis_status = "pending")';

		if (collection.fields.getByName('steam_id')) {
			collection.fields.removeByName('steam_id');
		}

		if (!collection.fields.getByName('analysis_status')) {
			collection.fields.add(
				new Field({
					hidden: false,
					id: 'select_ac_captures_analysis_status',
					maxSelect: 1,
					name: 'analysis_status',
					presentable: true,
					required: true,
					system: false,
					type: 'select',
					values: ['pending', 'skipped', 'clean', 'flagged', 'error']
				})
			);
		}

		return app.save(collection);
	}
);
