/// <reference path="../pb_data/types.d.ts" />

'use strict';

onRecordAfterUpdateSuccess((e) => {
	try {
		const merge = require(`${__hooks}/lib/user-merge.js`);
		if (!merge.steamIdsChanged(e.record)) {
			return;
		}
		const result = merge.mergeFromUser(e.record.id, e.record.id);
		if (result.merged) {
			console.log(
				`[user_merge] hook keeper=${result.keeperId} losers=${(result.loserIds || []).join(',')}`
			);
		}
	} catch (error) {
		console.warn('[user_merge] hook', String(error?.message || error));
	}
}, 'users');

$app.onServe().bindFunc((e) => {
	e.next();

	cronAdd('user_merge_duplicates', '7-59/10 * * * *', () => {
		const merge = require(`${__hooks}/lib/user-merge.js`);
		const result = merge.runOnce();
		if (result.merged) {
			console.log(
				`[user_merge] cron keeper=${result.keeperId} losers=${(result.loserIds || []).join(',')} remaining=${result.remaining}`
			);
		}
	});
});

routerAdd('POST', '/api/users/merge/run', (e) => {
	const merge = require(`${__hooks}/lib/user-merge.js`);
	if (!merge.isServiceRequest(e) && !e.hasSuperuserAuth()) {
		return e.json(401, { message: 'Unauthorized' });
	}

	const max = Number(e.request.url.query().get('max') || '1');
	return e.json(200, merge.runBatch(max));
});
