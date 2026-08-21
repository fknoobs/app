import { describe, expect, it } from 'vitest';
import {
	eloMapForSteamId,
	extractPlayerRatingSnapshots,
	extractPlayerRatingSnapshotsFromLobby,
	getMatchTypeIdFromLeaderboardId,
	getStoredEloForLeaderboard,
	getStoredEloRating,
	isStoredMatchType,
	mergeEloMaps
} from './player-elo';
import type { LobbyPlayer, TransformedMatch } from '@fknoobs/app';

function match(partial: Partial<TransformedMatch> & { players: TransformedMatch['players'] }): TransformedMatch {
	return {
		id: 100,
		creator_profile_id: 1,
		mapname: '2p_semois',
		maxplayers: 2,
		matchtype_id: 1,
		options: '',
		slotinfo: '',
		description: '',
		startgametime: 10,
		completiontime: 20,
		observertotal: 0,
		outcome: 1,
		...partial
	};
}

function player(
	partial: Partial<TransformedMatch['players'][number]>
): TransformedMatch['players'][number] {
	return {
		profile_id: 1,
		name: '/steam/76561198000000001',
		alias: 'Hero',
		personal_statgroup_id: 1,
		xp: 0,
		level: 1,
		leaderboardregion_id: 0,
		country: 'nl',
		steamId: '76561198000000001',
		resulttype: 1,
		teamid: 0,
		race_id: 1,
		xpgained: 0,
		counters: '',
		matchstartdate: 0,
		statgroup_id: 1,
		wins: 1,
		losses: 0,
		streak: 1,
		arbitration: 0,
		outcome: 1,
		oldrating: 1500,
		newrating: 1510,
		reporttype: 1,
		...partial
	};
}

describe('player-elo', () => {
	it('stores basic and ranked match types but skips skirmish and operations', () => {
		expect(isStoredMatchType(0)).toBe(true);
		expect(isStoredMatchType(4)).toBe(true);
		expect(isStoredMatchType(7)).toBe(true);
		expect(isStoredMatchType(14)).toBe(false);
		expect(isStoredMatchType(15)).toBe(false);
		expect(getMatchTypeIdFromLeaderboardId(5)).toBe(1);
		expect(getMatchTypeIdFromLeaderboardId(42)).toBeNull();
	});

	it('keeps the newest rating per match type and race', () => {
		const snapshots = extractPlayerRatingSnapshots([
			match({
				id: 1,
				matchtype_id: 1,
				completiontime: 10,
				players: [player({ newrating: 1400, race_id: 1 })]
			}),
			match({
				id: 2,
				matchtype_id: 1,
				completiontime: 30,
				players: [player({ newrating: 1550, race_id: 1 })]
			}),
			match({
				id: 3,
				matchtype_id: 14,
				completiontime: 40,
				players: [player({ newrating: 1000, race_id: 1 })]
			})
		]);

		expect(snapshots).toHaveLength(1);
		expect(snapshots[0].slots).toEqual([
			{ matchtypeId: 1, raceId: 1, rating: 1550, matchId: 2, at: 30 }
		]);
	});

	it('extracts only the lobby player from attached match history', () => {
		const lobbyPlayer = {
			index: 0,
			playerId: 1,
			type: 0,
			team: 0,
			race: 1,
			steamId: '76561198000000001',
			matchHistory: [
				match({
					players: [
						player({ profile_id: 1, steamId: '76561198000000001', alias: 'Hero', race_id: 0 }),
						player({
							profile_id: 2,
							name: '/steam/76561198000000002',
							steamId: '76561198000000002',
							alias: 'Foe',
							race_id: 1
						})
					]
				})
			]
		} as LobbyPlayer;

		const snapshots = extractPlayerRatingSnapshotsFromLobby([lobbyPlayer]);
		expect(snapshots).toHaveLength(1);
		expect(snapshots[0].steamId).toBe('76561198000000001');
		expect(snapshots[0].slots[0].raceId).toBe(0);
	});

	it('reads stored ratings from the nested elo map', () => {
		expect(
			getStoredEloRating({ '1': { '1': { rating: 1580, matchId: 9, at: 1 } } }, 1, 1)
		).toBe(1580);
		expect(getStoredEloRating({ '1': { '1': { rating: 1580, matchId: 9, at: 1 } } }, 14, 1)).toBe(
			null
		);
	});

	it('merges stored and match-history elo keeping the newest slot', () => {
		const history = [
			match({
				id: 2,
				matchtype_id: 1,
				completiontime: 20,
				players: [player({ newrating: 1510, race_id: 1 })]
			})
		];
		const fromHistory = eloMapForSteamId(history, '76561198000000001');
		const merged = mergeEloMaps(fromHistory, {
			'1': { '1': { rating: 1600, matchId: 9, at: 40 } },
			'2': { '0': { rating: 1400, matchId: 8, at: 10 } }
		});

		expect(getStoredEloForLeaderboard(merged, 5)).toBe(1600);
		expect(getStoredEloRating(merged, 2, 0)).toBe(1400);
	});
});
