/// <reference path="../pb_data/types.d.ts" />

'use strict';

routerAdd('OPTIONS', '/api/match/{id}', (e) => {
	return require(`${__hooks}/lib/match.js`).handleOptions(e);
});

routerAdd('GET', '/api/match/{id}', (e) => {
	return require(`${__hooks}/lib/match.js`).handleGet(e);
});

routerAdd('OPTIONS', '/api/match/{id}/download', (e) => {
	return require(`${__hooks}/lib/match.js`).handleOptions(e);
});

routerAdd('POST', '/api/match/{id}/download', (e) => {
	return require(`${__hooks}/lib/match.js`).handleDownload(e);
});

routerUse((e) => {
	const limited = require(`${__hooks}/lib/download-rate-limit.js`).limitFileRequest(e);
	if (limited) return limited;
	return e.next();
});
