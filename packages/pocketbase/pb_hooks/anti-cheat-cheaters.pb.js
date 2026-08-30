/// <reference path="../pb_data/types.d.ts" />

'use strict';

onRecordAfterCreateSuccess((e) => {
	try {
		require(`${__hooks}/lib/anti-cheat-cheaters.js`).syncForUser(e.record.get('user'));
	} catch (error) {
		console.warn('[anti_cheat_cheaters] create hook', String(error?.message || error));
	}
}, 'anti_cheat_cheaters');

onRecordAfterUpdateSuccess((e) => {
	try {
		const merge = require(`${__hooks}/lib/user-merge.js`);
		if (!merge.steamIdsChanged(e.record)) {
			return;
		}
		require(`${__hooks}/lib/anti-cheat-cheaters.js`).syncForUser(e.record.id);
	} catch (error) {
		console.warn('[anti_cheat_cheaters] user hook', String(error?.message || error));
	}
}, 'users');

$app.onServe().bindFunc((e) => {
	e.next();
	try {
		const result = require(`${__hooks}/lib/anti-cheat-cheaters.js`).syncAll();
		if (result.created > 0) {
			console.log(
				`[anti_cheat_cheaters] synced users=${result.users} created=${result.created}`
			);
		}
	} catch (error) {
		console.warn('[anti_cheat_cheaters] startup sync', String(error?.message || error));
	}
});
