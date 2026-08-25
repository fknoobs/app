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

export function getRaceLabel(race: Race | number): string {
	return RACE_LABELS[race as Race] ?? 'Unknown';
}

export function getRaceLabelFromLeaderboardId(leaderboardId: number): string {
	return getRaceLabel(getRaceFromLeaderboardId(leaderboardId));
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

function eloBandProgress(elo: number, min: number, max: number): number {
	if (elo <= min) return 0;
	if (elo >= max) return 1;
	return (elo - min) / (max - min);
}

function lerpOklch(
	from: { l: number; c: number; h: number },
	to: { l: number; c: number; h: number },
	t: number
): string {
	return `oklch(${lerp(from.l, to.l, t)} ${lerp(from.c, to.c, t)} ${lerp(from.h, to.h, t)})`;
}

/** Low = blue, mid = green, pro = brand gold; each band light → dark as elo rises. */
export function getEloColor(elo: number | null | undefined): string {
	if (typeof elo !== 'number' || elo < 1) return 'var(--color-secondary-400)';

	if (elo < 1500) {
		return lerpOklch(
			{ l: 0.82, c: 0.09, h: 230 },
			{ l: 0.5, c: 0.15, h: 255 },
			eloBandProgress(elo, 1000, 1500)
		);
	}

	if (elo < 1950) {
		return lerpOklch(
			{ l: 0.84, c: 0.12, h: 145 },
			{ l: 0.52, c: 0.16, h: 155 },
			eloBandProgress(elo, 1500, 1950)
		);
	}

	// Champagne → vivid brand gold → deep amber (premium)
	return lerpOklch(
		{ l: 0.92, c: 0.14, h: 92 },
		{ l: 0.72, c: 0.19, h: 72 },
		eloBandProgress(elo, 1950, 2400)
	);
}

export function isPremiumElo(elo: number | null | undefined): boolean {
	return typeof elo === 'number' && elo >= 1950;
}

export function getEloTextShadow(elo: number | null | undefined): string | undefined {
	if (!isPremiumElo(elo)) return undefined;
	const t = eloBandProgress(elo!, 1950, 2400);
	const glow = lerp(0.28, 0.48, t);
	const blur = lerp(8, 14, t);
	return `0 0 ${blur}px color-mix(in oklch, ${getEloColor(elo)} ${Math.round(glow * 100)}%, transparent)`;
}

export function formatRatio(wins: number, losses: number): string {
	if (losses > 0) return (wins / losses).toFixed(2);
	if (wins > 0) return '∞';
	return '0.00';
}
