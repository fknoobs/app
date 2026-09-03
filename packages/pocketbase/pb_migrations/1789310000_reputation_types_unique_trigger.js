/// <reference path="../pb_data/types.d.ts" />

const TRIGGER_INDEX =
	'CREATE UNIQUE INDEX `idx_reputation_types_trigger` ON `reputation_types` (`trigger`)';

migrate(
	(app) => {
		let types;
		try {
			types = app.findCollectionByNameOrId('reputation_types');
		} catch {
			return;
		}

		const keep = {};
		const extras = [];
		const rows = app.findAllRecords('reputation_types');
		for (const row of rows) {
			const trigger = String(row.get('trigger') || '');
			if (!trigger) {
				extras.push(row);
				continue;
			}

			const existing = keep[trigger];
			if (!existing) {
				keep[trigger] = row;
				continue;
			}

			if (String(row.get('created')) < String(existing.get('created'))) {
				extras.push(existing);
				keep[trigger] = row;
			} else {
				extras.push(row);
			}
		}

		for (const extra of extras) {
			try {
				app
					.db()
					.newQuery('DELETE FROM user_reputation WHERE type = {:id}')
					.bind({ id: extra.id })
					.execute();
			} catch {
				// ledger may not exist yet
			}

			try {
				app
					.db()
					.newQuery('DELETE FROM user_reputation_totals WHERE type = {:id}')
					.bind({ id: extra.id })
					.execute();
			} catch {
				// totals may not exist yet
			}

			try {
				app.delete(extra);
			} catch {
				// still referenced
			}
		}

		types.createRule = '@request.auth.role = "admin"';
		const indexes = [];
		for (const index of types.indexes) {
			indexes.push(String(index));
		}

		if (!indexes.some((sql) => sql.includes('idx_reputation_types_trigger'))) {
			indexes.push(TRIGGER_INDEX);
		}

		types.indexes = indexes;
		app.save(types);
	},
	(app) => {
		let types;
		try {
			types = app.findCollectionByNameOrId('reputation_types');
		} catch {
			return;
		}

		types.createRule = null;
		app.save(types);
	}
);
