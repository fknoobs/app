/// <reference path="../pb_data/types.d.ts" />

'use strict';

routerAdd(
	'POST',
	'/api/impersonate/{userId}',
	(e) => {
		return require(`${__hooks}/lib/impersonate.js`).handleImpersonate(e);
	},
	$apis.requireAuth('users')
);
