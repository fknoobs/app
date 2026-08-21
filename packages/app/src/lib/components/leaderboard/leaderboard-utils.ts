import { getRaceFromLeaderboardId, Race } from '$lib/utils/game';
import type { RelicProfile } from '@fknoobs/app';

export function getSteamIdFromProfile(profile: RelicProfile): string {
	return profile.name.replace('/steam/', '');
}

const RACE_LABELS: Record<Race, string> = {
	[Race.US]: 'US Forces',
	[Race.Wehrmacht]: 'Wehrmacht',
	[Race.Commonwealth]: 'British Forces',
	[Race.PanzerElite]: 'Panzer Elite'
};

export function getRaceLabelFromLeaderboardId(leaderboardId: number): string {
	return RACE_LABELS[getRaceFromLeaderboardId(leaderboardId)] ?? 'Unknown';
}

export function getRatioValue(wins: number, losses: number): number {
	if (losses === 0) return wins > 0 ? Infinity : 0;
	return wins / losses;
}

function lerp(min: number, max: number, t: number): number {
	return min + (max - min) * t;
}

function ratioToProgress(ratio: number): number {
	if (!Number.isFinite(ratio) || ratio <= 0) return 0;
	if (ratio >= 5) return 1;
	if (ratio <= 1) return ratio * 0.5;
	return 0.5 + ((ratio - 1) / 4) * 0.5;
}

function interpolateRatioColor(t: number): string {
	const stops = [
		{ t: 0, l: 0.5, c: 0.2, h: 25 },
		{ t: 0.5, l: 0.8, c: 0.14, h: 112 },
		{ t: 1, l: 0.72, c: 0.21, h: 145 }
	] as const;

	if (t <= stops[1].t) {
		const local = t / stops[1].t;
		return `oklch(${lerp(stops[0].l, stops[1].l, local)} ${lerp(stops[0].c, stops[1].c, local)} ${lerp(stops[0].h, stops[1].h, local)})`;
	}

	const local = (t - stops[1].t) / (stops[2].t - stops[1].t);
	return `oklch(${lerp(stops[1].l, stops[2].l, local)} ${lerp(stops[1].c, stops[2].c, local)} ${lerp(stops[1].h, stops[2].h, local)})`;
}

export function getRatioColor(wins: number, losses: number): string {
	if (wins === 0 && losses === 0) return 'var(--color-secondary-400)';

	const ratio = getRatioValue(wins, losses);
	if (ratio === Infinity) return 'oklch(0.72 0.21 145)';

	return interpolateRatioColor(ratioToProgress(ratio));
}

function streakToProgress(streak: number): number {
	if (streak >= 5) return 1;
	if (streak <= -5) return 0;
	return 0.5 + (streak / 5) * 0.5;
}

export function getStreakColor(streak: number): string {
	if (streak === 0) return 'var(--color-secondary-400)';

	return interpolateRatioColor(streakToProgress(streak));
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
		{ t: 0, l: 0.5, c: 0.2, h: 25 },
		{ t: 1 / 3, l: 0.8, c: 0.14, h: 112 },
		{ t: 2 / 3, l: 0.72, c: 0.21, h: 145 },
		{ t: 1, l: 0.84, c: 0.18, h: 85 }
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

export function getEloColor(elo: number | null | undefined): string {
	if (typeof elo !== 'number' || elo < 1) return 'var(--color-secondary-400)';
	return interpolateEloColor(eloToProgress(elo));
}

export function formatRatio(wins: number, losses: number): string {
	if (losses > 0) return (wins / losses).toFixed(2);
	if (wins > 0) return '∞';
	return '0.00';
}
