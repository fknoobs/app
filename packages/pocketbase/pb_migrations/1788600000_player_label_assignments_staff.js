/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
	const staff = '@request.auth.role = "admin" || @request.auth.role = "moderator"';
	let assignments;
	try {
		assignments = app.findCollectionByNameOrId('player_label_assignments');
	} catch {
		return;
	}
	assignments.createRule = staff;
	assignments.deleteRule = staff;
	app.save(assignments);
});
