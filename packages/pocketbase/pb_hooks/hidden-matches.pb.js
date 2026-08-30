/// <reference path="../pb_data/types.d.ts" />

'use strict';

onRecordCreateRequest((e) => {
	const lib = require(`${__hooks}/lib/hidden-matches.js`);
	lib.assignAuthUser(e.record, 'hiddenBy', e.auth);
	e.next();
	lib.invalidateHiddenCaches();
}, 'hidden_matches');

onRecordDeleteRequest((e) => {
	e.next();
	require(`${__hooks}/lib/hidden-matches.js`).invalidateHiddenCaches();
}, 'hidden_matches');

onRecordCreateRequest((e) => {
	const lib = require(`${__hooks}/lib/hidden-matches.js`);
	const word = lib.normalizeKeyword(e.record.get('word'));
	if (!word) {
		throw new BadRequestError('Word is required.');
	}
	e.record.set('word', word);
	lib.assignAuthUser(e.record, 'createdBy', e.auth);
	e.next();
	lib.invalidateHiddenCaches();
}, 'hidden_match_keywords');

onRecordUpdateRequest((e) => {
	const lib = require(`${__hooks}/lib/hidden-matches.js`);
	const word = lib.normalizeKeyword(e.record.get('word'));
	if (!word) {
		throw new BadRequestError('Word is required.');
	}
	e.record.set('word', word);
	e.next();
	lib.invalidateHiddenCaches();
}, 'hidden_match_keywords');

onRecordDeleteRequest((e) => {
	e.next();
	require(`${__hooks}/lib/hidden-matches.js`).invalidateHiddenCaches();
}, 'hidden_match_keywords');

onRecordViewRequest((e) => {
	const lib = require(`${__hooks}/lib/hidden-matches.js`);
	if (!lib.isStaffAuth(e.auth) && e.record && lib.isHiddenLobby(e.record)) {
		throw new NotFoundError();
	}
	e.next();
}, 'lobbies');

onRecordsListRequest((e) => {
	e.next();
	const lib = require(`${__hooks}/lib/hidden-matches.js`);
	if (lib.isStaffAuth(e.auth) || !e.records || e.records.length === 0) {
		return;
	}
	const hidden = lib.loadHiddenSessionIdMap();
	const keywords = lib.loadHiddenKeywords();
	if (Object.keys(hidden).length === 0 && keywords.length === 0) {
		return;
	}
	const visible = [];
	for (const record of e.records) {
		if (!record) {
			visible.push(record);
			continue;
		}
		if (hidden[Number(record.get('sessionId'))]) {
			continue;
		}
		if (lib.titleMatchesKeyword(lib.lobbyResultDescription(record), keywords)) {
			continue;
		}
		visible.push(record);
	}
	e.records = visible;
}, 'lobbies');
