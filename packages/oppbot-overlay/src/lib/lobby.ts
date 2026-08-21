import { getLeaderboardStat, getPlayerEloFromMatchHistory, getRacePrefix } from './helpers';
import type { CombatRecord, LobbyData, Player } from './types';

export const FACTION = ['US', 'WM', 'UK', 'PE'] as const;

const RACE_IMAGES = ['./images/us.png', './images/wm.png', './images/cw.png', './images/pe.png'];

export function getRaceImage(race: number): string {
	return RACE_IMAGES[race] ?? RACE_IMAGES[0];
}

export function getRankImage(type: number, player: Player): string {
	const stat = getLeaderboardStat(type, player);
	if (!stat || stat.ranklevel < 1) return './images/ranks/no_rank_yet.png';

	const prefix = getRacePrefix(player.race);
	return `./images/ranks/${prefix}_${stat.ranklevel.toString().padStart(2, '0')}.png`;
}

export function getFlagImage(country: string): string {
	return `https://flagsapi.com/${country.toUpperCase()}/flat/64.png`;
}

export function formatRankLevel(type: number, player: Player): string {
	const stat = getLeaderboardStat(type, player);
	if (!stat || stat.ranklevel < 1) return '—';
	return String(stat.ranklevel);
}

export function formatRanking(ranking: number | undefined): string {
	if (!ranking || ranking < 1) return '—';
	return `#${ranking.toLocaleString()}`;
}

export function formatElo(value: number | null): string {
	if (typeof value !== 'number' || value < 1) return 'NA';
	return value.toLocaleString();
}

function lerp(min: number, max: number, t: number): number {
	return min + (max - min) * t;
}

function eloToProgress(elo: number): number {
	if (elo <= 1000) return 0;
	if (elo >= 2400) return 1;
	if (elo <= 1400) return ((elo - 1000) / 400) * (1 / 3);
	if (elo <= 1800) return 1 / 3 + ((elo - 1400) / 400) * (1 / 3);
	return 2 / 3 + ((elo - 1800) / 600) * (1 / 3);
}

function interpolateEloColor(t: number): string {
	const stops = [
		{ t: 0, l: 0.62, c: 0.14, h: 35 },
		{ t: 1 / 3, l: 0.78, c: 0.12, h: 112 },
		{ t: 2 / 3, l: 0.76, c: 0.18, h: 145 },
		{ t: 1, l: 0.86, c: 0.16, h: 85 }
	] as const;

	for (let i = 0; i < stops.length - 1; i++) {
		const from = stops[i];
		const to = stops[i + 1];
		if (t <= to.t) {
			const local = (t - from.t) / (to.t - from.t);
			return `oklch(${lerp(from.l, to.l, local)} ${lerp(from.c, to.c, local)} ${lerp(from.h, to.h, local)})`;
		}
	}

	const last = stops[stops.length - 1];
	return `oklch(${last.l} ${last.c} ${last.h})`;
}

export function getEloColor(elo: number | null): string {
	if (typeof elo !== 'number' || elo < 1) return 'var(--ink-dim)';
	return interpolateEloColor(eloToProgress(elo));
}

export function getCombatRecord(type: number, player: Player): CombatRecord {
	const stat = getLeaderboardStat(type, player);
	const eloValue = getPlayerEloFromMatchHistory(type, player);
	const elo = formatElo(eloValue);

	if (!stat) {
		return { wins: 0, losses: 0, winRate: null, streak: 0, elo, eloValue };
	}

	const wins = Math.max(0, stat.wins ?? 0);
	const losses = Math.max(0, stat.losses ?? 0);
	const total = wins + losses;
	const winRate = total > 0 ? Math.round((wins / total) * 100) : null;
	const streak = typeof stat.streak === 'number' ? stat.streak : 0;

	return { wins, losses, winRate, streak, elo, eloValue };
}

export function formatStreak(streak: number): string | null {
	if (!streak) return null;
	return streak > 0 ? `+${streak}` : `${streak}`;
}

export function getPlayerCount(data: LobbyData): number {
	if (data.players?.length) return data.players.length;
	return data.teams?.reduce((sum, team) => sum + (team.players?.length ?? 0), 0) ?? 0;
}

export function prepareLobbyData(data: LobbyData): LobbyData {
	if (data.teams) {
		const meId = data.me?.playerId;

		data.teams = [...data.teams].sort((a, b) => {
			const aHasMe = a.players.some((p) => p.playerId === meId) ? 0 : 1;
			const bHasMe = b.players.some((p) => p.playerId === meId) ? 0 : 1;
			return aHasMe - bHasMe;
		});
	}

	return data;
}
