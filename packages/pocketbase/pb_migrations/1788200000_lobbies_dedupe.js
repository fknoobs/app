/// <reference path="../pb_data/types.d.ts" />

// Duplicate lobbies (same sessionId) are removed by pb_hooks/lobbies-dedupe.pb.js
// after serve. Full-table DELETE here would block startup on large local DBs.
migrate(
	(app) => {
		try {
			const snapshot = app.findRecordById('match_filter_snapshots', 'community');
			snapshot.set('matchCount', 0);
			app.save(snapshot);
		} catch {
			// snapshot not ready
		}
	},
	() => {}
);
