/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
	const replays = app.findCollectionByNameOrId('replays');
	// Soft-delete only: owners must not hard-delete via PocketBase REST.
	replays.deleteRule = null;
	app.save(replays);
});
