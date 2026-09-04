'use strict';

function reputation() {
	return require(`${__hooks}/lib/reputation.js`);
}

function recordId(value) {
	if (!value) {
		return '';
	}

	if (typeof value === 'object' && value.id) {
		return String(value.id);
	}

	return String(value);
}

function voteValue(record) {
	const raw = Number(record.get('value'));
	if (raw === -1) {
		return -1;
	}

	return 1;
}

function normalizeSteamId(value) {
	let steam = String(value || '').trim();
	if (steam.startsWith('/steam/')) {
		steam = steam.slice('/steam/'.length);
	}

	return steam;
}

function adjustPlayerLikeCount(steamId, delta) {
	const id = normalizeSteamId(steamId);
	if (!id || !delta) {
		return;
	}

	try {
		let score;
		try {
			score = $app.findFirstRecordByFilter('player_vote_scores', 'steamId = {:steamId}', {
				steamId: id
			});
		} catch {
			score = new Record($app.findCollectionByNameOrId('player_vote_scores'));
			score.set('steamId', id);
			score.set('likeCount', 0);
		}

		const current = Number(score.get('likeCount')) || 0;
		score.set('likeCount', current + delta);
		$app.save(score);
	} catch (error) {
		console.warn('[player_social] failed to update likeCount', String(error?.message || error));
	}
}

function onLikeCreate(e) {
	const steamId = normalizeSteamId(e.record.get('steamId'));
	if (!steamId) {
		throw new BadRequestError('steamId is required');
	}

	e.record.set('steamId', steamId);
	const value = Number(e.record.get('value'));
	e.record.set('value', value === -1 ? -1 : 1);
}

function onLikeUpdate(e) {
	const original = e.record.original();
	e.record.set('steamId', original.get('steamId'));
	e.record.set('user', original.get('user'));
	const steamId = normalizeSteamId(e.record.get('steamId'));
	const value = Number(e.record.get('value'));
	if (value !== 1 && value !== -1) {
		throw new BadRequestError('Vote must be 1 or -1');
	}

	e.record.set('value', value);
	const oldValue = voteValue(original);
	e.next();
	const delta = value - oldValue;
	if (delta) {
		adjustPlayerLikeCount(steamId, delta);
		reputation().syncPlayerVote(e.record, value);
	}
}

function onLikeCreated(e) {
	adjustPlayerLikeCount(e.record.get('steamId'), voteValue(e.record));
	reputation().syncPlayerVote(e.record, voteValue(e.record));
}

function onLikeDeleted(e) {
	adjustPlayerLikeCount(e.record.get('steamId'), -voteValue(e.record));
	reputation().syncPlayerVote(e.record, 0);
}

const BATCH_SIZE = 40;

function hasVoteScoresCollection() {
	try {
		$app.findCollectionByNameOrId('player_vote_scores');
		return true;
	} catch {
		return false;
	}
}

function loadLikeCountsBySteamIds(steamIds) {
	const bySteam = {};
	if (!hasVoteScoresCollection()) {
		return bySteam;
	}

	const unique = [];
	const seen = {};
	for (const steamId of steamIds ?? []) {
		const id = normalizeSteamId(steamId);
		if (!id || seen[id]) {
			continue;
		}

		seen[id] = true;
		unique.push(id);
	}

	if (unique.length === 0) {
		return bySteam;
	}

	for (let i = 0; i < unique.length; i += BATCH_SIZE) {
		const chunk = unique.slice(i, i + BATCH_SIZE);
		const params = {};
		const filter = chunk
			.map((_, index) => {
				params[`s${index}`] = chunk[index];
				return `steamId = {:s${index}}`;
			})
			.join(' || ');
		try {
			const rows = $app.findRecordsByFilter('player_vote_scores', filter, '', 500, 0, params);
			for (const row of rows) {
				const steamId = normalizeSteamId(row.get('steamId'));
				if (steamId) {
					bySteam[steamId] = Number(row.get('likeCount')) || 0;
				}
			}
		} catch (error) {
			console.warn('[player_social] likeCount batch failed', String(error?.message || error));
		}
	}

	return bySteam;
}

function attachLikeCountsToPlayers(players, countsBySteamId) {
	if (!players || !players.length) {
		return players || [];
	}

	for (const player of players) {
		const steamId = normalizeSteamId(player?.steamId);
		if (steamId && Object.prototype.hasOwnProperty.call(countsBySteamId, steamId)) {
			player.likeCount = countsBySteamId[steamId];
		}
	}

	return players;
}

function attachLikeCountsToMatches(matches, countsBySteamId) {
	if (!matches || !matches.length) {
		return matches || [];
	}

	for (const match of matches) {
		attachLikeCountsToPlayers(match.players ?? [], countsBySteamId);
	}

	return matches;
}

module.exports = {
	onLikeCreate,
	onLikeUpdate,
	onLikeCreated,
	onLikeDeleted,
	adjustPlayerLikeCount,
	loadLikeCountsBySteamIds,
	attachLikeCountsToPlayers,
	attachLikeCountsToMatches,
	recordId
};
