'use strict';

const COUNTER_FIELDS = ['likeCount', 'downloadCount', 'commentCount'];

function adjustLobbyCounter(lobbyId, field, delta) {
	if (!lobbyId || !field) {
		return;
	}

	try {
		const lobby = $app.findRecordById('lobbies', lobbyId);
		const current = Number(lobby.get(field)) || 0;
		lobby.set(field, Math.max(0, current + delta));
		$app.save(lobby);
	} catch (error) {
		console.warn('[match_social] failed to update', field, String(error?.message || error));
	}
}

function restoreCounterFields(e) {
	try {
		if (!e.hasSuperuserAuth()) {
			const original = e.record.original();
			for (const field of COUNTER_FIELDS) {
				e.record.set(field, original.get(field));
			}
		}
	} catch (error) {
		console.warn('[match_social] restoreCounterFields', String(error?.message || error));
	}

	e.next();
}

function onLikeCreated(e) {
	adjustLobbyCounter(e.record.get('lobby'), 'likeCount', 1);
}

function onLikeDeleted(e) {
	adjustLobbyCounter(e.record.get('lobby'), 'likeCount', -1);
}

function recordId(value) {
	if (!value) return '';
	if (typeof value === 'object' && value.id) return String(value.id);
	return String(value);
}

function addSteamId(found, value) {
	if (!value) return;
	let steam = String(value).trim();
	if (steam.startsWith('/steam/')) steam = steam.slice('/steam/'.length);
	if (steam) found[steam] = true;
}

function querySteamIds(sql, lobbyId) {
	try {
		const rows = arrayOf(new DynamicModel({ steamId: '' }));
		$app.db().newQuery(sql).bind({ lobby: lobbyId }).all(rows);
		return rows;
	} catch (error) {
		console.warn('[match_social] steam query', String(error?.message || error));
		return [];
	}
}

function collectLobbySteamIds(lobbyId) {
	const found = Object.create(null);
	const queries = [
		`SELECT DISTINCT steam_id AS steamId FROM lobby_player_index
		 WHERE lobby = {:lobby} AND steam_id IS NOT NULL AND steam_id != ''`,
		`SELECT DISTINCT CAST(json_extract(p.value, '$.steamId') AS TEXT) AS steamId
		 FROM json_each((
			 SELECT CASE WHEN json_valid(lobbyPlayers) THEN lobbyPlayers ELSE '[]' END
			 FROM lobbies WHERE id = {:lobby}
		 )) AS p
		 WHERE json_extract(p.value, '$.steamId') IS NOT NULL
			 AND json_extract(p.value, '$.steamId') != ''`,
		`SELECT DISTINCT CAST(json_extract(p.value, '$.steamId') AS TEXT) AS steamId
		 FROM json_each((
			 SELECT CASE
				 WHEN json_valid(result) AND json_type(json_extract(result, '$.players')) = 'array'
				 THEN json_extract(result, '$.players')
				 ELSE '[]'
			 END
			 FROM lobbies WHERE id = {:lobby}
		 )) AS p
		 WHERE json_extract(p.value, '$.steamId') IS NOT NULL
			 AND json_extract(p.value, '$.steamId') != ''`
	];
	for (const sql of queries) {
		for (const row of querySteamIds(sql, lobbyId)) addSteamId(found, row.steamId);
	}
	return Object.keys(found);
}

function findUserIdsBySteamIds(steamIds) {
	if (!steamIds.length) return [];
	const bindings = {};
	const placeholders = [];
	for (let i = 0; i < steamIds.length; i++) {
		const key = 'sid' + i;
		bindings[key] = steamIds[i];
		placeholders.push('{:' + key + '}');
	}
	try {
		const rows = arrayOf(new DynamicModel({ id: '' }));
		$app
			.db()
			.newQuery(
				`SELECT DISTINCT u.id AS id
				 FROM users u, json_each(
					 CASE WHEN json_valid(u.steamIds) THEN u.steamIds ELSE '[]' END
				 ) AS s
				 WHERE CAST(s.value AS TEXT) IN (${placeholders.join(', ')})`
			)
			.bind(bindings)
			.all(rows);
		return rows.map((row) => String(row.id)).filter(Boolean);
	} catch (error) {
		console.warn('[match_social] find users by steam', String(error?.message || error));
		return [];
	}
}

function commenterName(userId) {
	try {
		const user = $app.findRecordById('users', userId);
		return String(user.get('name') || '').trim() || 'Someone';
	} catch {
		return 'Someone';
	}
}

function commentSnippet(text) {
	const plain = String(text || '')
		.replace(/\s+/g, ' ')
		.trim();
	if (!plain) return '';
	if (plain.length <= 280) return plain;
	return plain.slice(0, 277) + '...';
}

function notifyMatchPlayers(comment) {
	try {
		const lobbyId = recordId(comment.get('lobby'));
		const commenterId = recordId(comment.get('user'));
		if (!lobbyId || !commenterId) {
			console.warn('[match_social] notify skip: missing lobby or user');
			return;
		}
		const steamIds = collectLobbySteamIds(lobbyId);
		const userIds = findUserIdsBySteamIds(steamIds).filter((id) => id !== commenterId);
		if (!userIds.length) {
			console.warn('[match_social] notify skip: no recipients', lobbyId, 'steam', steamIds.length);
			return;
		}
		const isReply = Boolean(parentId(comment));
		const name = commenterName(commenterId);
		const body =
			commentSnippet(comment.get('text')) || (isReply ? 'New reply' : 'New comment');
		const record = new Record($app.findCollectionByNameOrId('notifications'));
		record.set(
			'title',
			isReply ? `${name} replied on a match you played` : `${name} commented on a match you played`
		);
		record.set('body', body);
		record.set('targetAll', false);
		record.set('recipients', userIds);
		record.set('lobby', lobbyId);
		record.set('createdBy', commenterId);
		$app.save(record);
		console.log('[match_social] notify', lobbyId, 'recipients', userIds.length);
	} catch (error) {
		console.warn('[match_social] notifyMatchPlayers', String(error?.message || error));
	}
}

function onCommentCreated(e) {
	adjustLobbyCounter(e.record.get('lobby'), 'commentCount', 1);
	notifyMatchPlayers(e.record);
}

function onCommentDeleted(e) {
	adjustLobbyCounter(e.record.get('lobby'), 'commentCount', -1);
}

const MAX_COMMENT_DEPTH = 8;
const COMMENT_PROTECTED_FIELDS = ['likeCount', 'parent', 'lobby', 'user'];

function parentId(record) {
	const value = record.get('parent');
	if (!value) return '';
	if (typeof value === 'object' && value.id) return String(value.id);
	return String(value);
}

function commentDepth(commentId) {
	let depth = 0;
	let current = commentId;
	const seen = Object.create(null);
	while (current && depth <= MAX_COMMENT_DEPTH) {
		if (seen[current]) break;
		seen[current] = true;
		let record;
		try {
			record = $app.findRecordById('lobby_comments', current);
		} catch {
			break;
		}
		current = parentId(record);
		if (current) depth += 1;
	}
	return depth;
}

function onCommentCreate(e) {
	if (!e.record) return;
	if (!e.hasSuperuserAuth()) {
		e.record.set('likeCount', 0);
	}
	const parent = parentId(e.record);
	if (!parent) return;
	let parentRecord;
	try {
		parentRecord = $app.findRecordById('lobby_comments', parent);
	} catch {
		throw new BadRequestError('Parent comment not found');
	}
	if (String(parentRecord.get('lobby')) !== String(e.record.get('lobby'))) {
		throw new BadRequestError('Reply must be on the same match');
	}
	if (commentDepth(parent) + 1 > MAX_COMMENT_DEPTH) {
		throw new BadRequestError('Reply is nested too deep');
	}
}

function restoreCommentProtectedFields(e) {
	try {
		if (!e.hasSuperuserAuth()) {
			const original = e.record.original();
			for (const field of COMMENT_PROTECTED_FIELDS) {
				e.record.set(field, original.get(field));
			}
		}
	} catch (error) {
		console.warn('[match_social] restoreCommentProtectedFields', String(error?.message || error));
	}
	e.next();
}

function adjustCommentLikeCount(commentId, delta) {
	if (!commentId) return;
	try {
		const comment = $app.findRecordById('lobby_comments', commentId);
		const current = Number(comment.get('likeCount')) || 0;
		comment.set('likeCount', Math.max(0, current + delta));
		$app.save(comment);
	} catch (error) {
		console.warn('[match_social] failed to update comment likeCount', String(error?.message || error));
	}
}

function onCommentLikeCreated(e) {
	adjustCommentLikeCount(e.record.get('comment'), 1);
}

function onCommentLikeDeleted(e) {
	adjustCommentLikeCount(e.record.get('comment'), -1);
}

function handleRecordDownload(e) {
	const auth = e.auth;

	if (!auth?.id) {
		return e.json(401, { message: 'Unauthorized' });
	}

	const lobbyId = e.request.pathValue('id');

	if (!lobbyId) {
		return e.json(400, { message: 'lobby id required' });
	}

	let lobby;

	try {
		lobby = $app.findRecordById('lobbies', lobbyId);
	} catch {
		return e.json(404, { message: 'Match not found' });
	}

	try {
		$app.findFirstRecordByFilter(
			'lobby_downloads',
			'lobby = {:lobby} && user = {:user}',
			{ lobby: lobbyId, user: auth.id }
		);

		return e.json(200, { downloadCount: Number(lobby.get('downloadCount')) || 0 });
	} catch {
		// first download for this user
	}

	try {
		const collection = $app.findCollectionByNameOrId('lobby_downloads');
		const record = new Record(collection);
		record.set('lobby', lobbyId);
		record.set('user', auth.id);
		$app.save(record);
	} catch (error) {
		try {
			lobby = $app.findRecordById('lobbies', lobbyId);
			return e.json(200, { downloadCount: Number(lobby.get('downloadCount')) || 0 });
		} catch {
			return e.json(400, { message: String(error?.message || error) });
		}
	}

	adjustLobbyCounter(lobbyId, 'downloadCount', 1);

	try {
		lobby = $app.findRecordById('lobbies', lobbyId);
	} catch {
		return e.json(200, { downloadCount: 1 });
	}

	return e.json(200, { downloadCount: Number(lobby.get('downloadCount')) || 1 });
}

module.exports = {
	restoreCounterFields,
	restoreCommentProtectedFields,
	onLikeCreated,
	onLikeDeleted,
	onCommentCreate,
	onCommentCreated,
	onCommentDeleted,
	onCommentLikeCreated,
	onCommentLikeDeleted,
	handleRecordDownload
};
