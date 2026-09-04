/// <reference path="../pb_data/types.d.ts" />

/**
 * Allow authenticated users to change their own email/password (Manage API rule).
 * Keep role, reputation, and verified protected via updateRule.
 */
migrate(
	(app) => {
		const users = app.findCollectionByNameOrId('_pb_users_auth_');
		users.manageRule = 'id = @request.auth.id';
		users.updateRule =
			'id = @request.auth.id && @request.body.role:changed = false && @request.body.reputation:changed = false && @request.body.verified:changed = false';
		app.save(users);
	},
	(app) => {
		const users = app.findCollectionByNameOrId('_pb_users_auth_');
		users.manageRule = null;
		users.updateRule =
			'id = @request.auth.id && @request.body.role:changed = false && @request.body.reputation:changed = false';
		app.save(users);
	}
);
