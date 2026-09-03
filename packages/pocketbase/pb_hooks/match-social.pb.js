/// <reference path="../pb_data/types.d.ts" />

'use strict';

onRecordUpdateRequest((e) => {
	require(`${__hooks}/lib/match-social.js`).restoreCounterFields(e);
}, 'lobbies');

onRecordCreateRequest((e) => {
	require(`${__hooks}/lib/match-social.js`).onLikeCreate(e);
	e.next();
}, 'lobby_likes');

onRecordUpdateRequest((e) => {
	require(`${__hooks}/lib/match-social.js`).onLikeUpdate(e);
}, 'lobby_likes');

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

onRecordCreateRequest((e) => {
	require(`${__hooks}/lib/match-social.js`).onCommentLikeCreate(e);
	e.next();
}, 'lobby_comment_likes');

onRecordUpdateRequest((e) => {
	require(`${__hooks}/lib/match-social.js`).onCommentLikeUpdate(e);
}, 'lobby_comment_likes');

onRecordAfterCreateSuccess((e) => {
	require(`${__hooks}/lib/match-social.js`).onCommentLikeCreated(e);
}, 'lobby_comment_likes');

onRecordAfterDeleteSuccess((e) => {
	require(`${__hooks}/lib/match-social.js`).onCommentLikeDeleted(e);
}, 'lobby_comment_likes');

routerAdd('POST', '/api/lobbies/{id}/download', (e) => {
	return require(`${__hooks}/lib/match-social.js`).handleRecordDownload(e);
});
