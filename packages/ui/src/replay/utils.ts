import type {
	CommunityMatch,
	CommunityMatchDetail,
	CommunityPlayer,
	MatchResultPlayer
} from './types';

export function isAlliesRace(race: number | null | undefined): boolean {
	return race === 0 || race === 2;
}

export function isAxisRace(race: number | null | undefined): boolean {
	return race === 1 || race === 3;
}

export function teamPlayers(match: CommunityMatch | CommunityMatchDetail, team: 'allies' | 'axis') {
	return match.players.filter((player) =>
		team === 'allies' ? isAlliesRace(player.race) : isAxisRace(player.race)
	);
}

export function teamOutcome(
	match: CommunityMatch | CommunityMatchDetail,
	team: 'allies' | 'axis'
): 'win' | 'loss' | null {
	const members = teamPlayers(match, team);
	const resultPlayers = match.result?.players ?? [];
	for (const member of members) {
		const profileId = member.profile.profile_id;
		const result = resultPlayers.find((entry) => entry.profile_id === profileId);
		if (result?.outcome === 1) return 'win';
		if (result?.outcome === 0) return 'loss';
	}
	return null;
}

export function matchDurationSeconds(match: CommunityMatch | CommunityMatchDetail): number | null {
	if ('durationSeconds' in match && match.durationSeconds != null) {
		return match.durationSeconds;
	}
	const start = Number(match.result?.startgametime);
	const end = Number(match.result?.completiontime);
	if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
		return end - start;
	}
	return null;
}

export function formatDurationSeconds(seconds: number | null): string {
	if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—';
	const total = Math.round(seconds);
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const rest = total % 60;
	if (hours > 0) return `${hours}h ${minutes}m ${rest}s`;
	return `${minutes}m ${rest}s`;
}

export function formatMatchDate(value: string | undefined, locale?: string): string {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return date.toLocaleDateString(locale, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function findResultPlayer(
	match: CommunityMatchDetail,
	lobby: CommunityPlayer
): MatchResultPlayer | undefined {
	return match.result?.players?.find(
		(player) => player.profile_id === lobby.profile.profile_id
	);
}
