/// <reference path="../pb_data/types.d.ts" />

// Slot is filled by dual-write on lobby save and `history_catalog_backfill`.
// No data UPDATE or index on lobby_player_index here — that would block startup.

migrate(
	(app) => {
		let collection;
		try {
			collection = app.findCollectionByNameOrId('lobby_player_index');
		} catch {
			return;
		}

		if (collection.fields.getByName('slot')) {
			return;
		}

		collection.fields.add(
			new Field({
				hidden: false,
				id: 'number_lobby_player_index_slot',
				max: 8,
				min: 0,
				name: 'slot',
				onlyInt: true,
				presentable: false,
				required: false,
				system: false,
				type: 'number'
			})
		);
		app.save(collection);
	},
	(app) => {
		let collection;
		try {
			collection = app.findCollectionByNameOrId('lobby_player_index');
		} catch {
			return;
		}
		if (collection.fields.getByName('slot')) {
			collection.fields.removeByName('slot');
			app.save(collection);
		}
	}
);
