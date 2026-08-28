/// <reference path="../pb_data/types.d.ts" />

'use strict';

onRecordUpdateRequest((e) => {
	require(`${__hooks}/lib/match-social.js`).restoreCounterFields(e);
}, 'lobbies');

onRecordAfterCreateSuccess((e) => {
	require(`${__hooks}/lib/match-social.js`).onLikeCreated(e);
}, 'lobby_likes');

onRecordAfterDeleteSuccess((e) => {
	require(`${__hooks}/lib/match-social.js`).onLikeDeleted(e);
}, 'lobby_likes');

onRecordCreateRequest((e) => {
	require(`${__hooks}/lib/match-social.js`).onCommentCreate(e);
	e.next();
}, 'lobby_comments');

onRecordUpdateRequest((e) => {
	require(`${__hooks}/lib/match-social.js`).restoreCommentProtectedFields(e);
}, 'lobby_comments');

onRecordAfterCreateSuccess((e) => {
	require(`${__hooks}/lib/match-social.js`).onCommentCreated(e);
}, 'lobby_comments');

onRecordAfterDeleteSuccess((e) => {
	require(`${__hooks}/lib/match-social.js`).onCommentDeleted(e);
}, 'lobby_comments');

onRecordAfterCreateSuccess((e) => {
	require(`${__hooks}/lib/match-social.js`).onCommentLikeCreated(e);
}, 'lobby_comment_likes');

onRecordAfterDeleteSuccess((e) => {
	require(`${__hooks}/lib/match-social.js`).onCommentLikeDeleted(e);
}, 'lobby_comment_likes');

routerAdd('POST', '/api/lobbies/{id}/download', (e) => {
	return require(`${__hooks}/lib/match-social.js`).handleRecordDownload(e);
});
