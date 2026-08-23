/// <reference path="../pb_data/types.d.ts" />

migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId('player_ratings');

		if (!collection.fields.getByName('harvestedAt')) {
			collection.fields.add(
				new Field({
					hidden: false,
					id: 'date_player_ratings_harvested_at',
					max: '',
					min: '',
					name: 'harvestedAt',
					presentable: false,
					required: false,
					system: false,
					type: 'date'
				})
			);
		}

		const indexes = [];
		for (const index of collection.indexes) {
			indexes.push(index);
		}
		if (!indexes.some((index) => String(index).includes('idx_player_ratings_harvested_at'))) {
			indexes.push(
				'CREATE INDEX `idx_player_ratings_harvested_at` ON `player_ratings` (`harvestedAt`)'
			);
			collection.indexes = indexes;
		}

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId('player_ratings');

		if (collection.fields.getByName('harvestedAt')) {
			collection.fields.removeByName('harvestedAt');
		}

		const indexes = [];
		for (const index of collection.indexes) {
			if (!String(index).includes('idx_player_ratings_harvested_at')) {
				indexes.push(index);
			}
		}
		collection.indexes = indexes;

		return app.save(collection);
	}
);
