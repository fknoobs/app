/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
	const replays = app.findCollectionByNameOrId('replays');
	const visibility = replays.fields.getByName('visibility');
	if (visibility && Array.isArray(visibility.values)) {
		const next = [...visibility.values];
		if (!next.includes('deleted')) {
			next.push('deleted');
			visibility.values = next;
		}
	}

	const staff = '@request.auth.role = "admin" || @request.auth.role = "moderator"';
	replays.listRule = `visibility = "member" || (${staff}) || (createdBy = @request.auth.id && visibility != "deleted")`;
	replays.viewRule = `visibility = "member" || (${staff}) || (createdBy = @request.auth.id && visibility != "deleted")`;

	app.save(replays);
});
