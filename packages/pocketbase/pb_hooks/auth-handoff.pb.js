/// <reference path="../pb_data/types.d.ts" />

'use strict';

routerAdd(
	'POST',
	'/api/auth/handoff',
	(e) => {
		return require(`${__hooks}/lib/handoff-signed.js`).handleCreate(e);
	},
	$apis.requireAuth('users')
);

routerAdd('POST', '/api/auth/handoff/exchange', (e) => {
	return require(`${__hooks}/lib/handoff-signed.js`).handleExchange(e);
});
