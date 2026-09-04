/// <reference path="../pb_data/types.d.ts" />

'use strict';

onRecordCreateRequest((e) => {
	require(`${__hooks}/lib/player-social.js`).onLikeCreate(e);
	e.next();
}, 'player_likes');

onRecordUpdateRequest((e) => {
	require(`${__hooks}/lib/player-social.js`).onLikeUpdate(e);
}, 'player_likes');

onRecordAfterCreateSuccess((e) => {
	require(`${__hooks}/lib/player-social.js`).onLikeCreated(e);
}, 'player_likes');

onRecordAfterDeleteSuccess((e) => {
	require(`${__hooks}/lib/player-social.js`).onLikeDeleted(e);
}, 'player_likes');
