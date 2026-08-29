/// <reference path="../pb_data/types.d.ts" />

// Catalog rows and duration/avgElo are filled by `history_catalog_backfill`
// after serve. Full-table SQL here blocked startup on large local DBs.
migrate(
	() => {},
	() => {}
);
