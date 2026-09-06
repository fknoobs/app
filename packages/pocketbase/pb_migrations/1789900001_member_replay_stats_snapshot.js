/// <reference path="../pb_data/types.d.ts" />

migrate(
	(app) => {
		const replays = app.findCollectionByNameOrId('replays');
		if (!replays.fields.getByName('statsSnapshot')) {
			replays.fields.add(
				new Field({
					hidden: false,
					id: 'json_replays_stats_snapshot',
					maxSize: 200000,
					name: 'statsSnapshot',
					presentable: false,
					required: false,
					system: false,
					type: 'json'
				})
			);
			app.save(replays);
		}
	},
	(app) => {
		const replays = app.findCollectionByNameOrId('replays');
		if (replays.fields.getByName('statsSnapshot')) {
			replays.fields.removeByName('statsSnapshot');
			app.save(replays);
		}
	}
);
