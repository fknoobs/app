export type LiveLobbyPlayer = {
	index: number;
	playerId: number;
	type?: number;
	race: number;
	alias: string;
	profileId: number | null;
	steamId: string | null;
};

export type LiveLobby = {
	id: string;
	sessionId: string;
	map: string;
	isRanked: boolean;
	createdAt: string;
	updatedAt: string;
	hostName: string;
	players: LiveLobbyPlayer[];
	modeLabel: string;
};

/** Relic logs closed/empty slots as Id -1 with Type 3 or 6. Real skirmish AI is Id -1 with Type 1. */
export function isOccupiedLiveLobbyPlayer(player: LiveLobbyPlayer): boolean {
	if (player.playerId === -1) {
		return player.type === 1;
	}

	return player.playerId > 0;
}

export function isAlliesRace(race: number): boolean {
	return race === 0 || race === 2;
}

export function isAxisRace(race: number): boolean {
	return race === 1 || race === 3;
}

export function teamPlayers(
	players: LiveLobbyPlayer[],
	team: 'allies' | 'axis'
): LiveLobbyPlayer[] {
	return players.filter(isOccupiedLiveLobbyPlayer).filter((player) =>
		team === 'allies' ? isAlliesRace(player.race) : isAxisRace(player.race)
	);
}

export function defaultLiveLobbyPlayerLabel(player: LiveLobbyPlayer): string {
	if (player.alias.trim()) {
		return player.alias;
	}

	if (player.playerId === -1) {
		return 'CPU opponent';
	}

	return `Player ${player.index + 1}`;
}

export function playerRowKey(player: LiveLobbyPlayer, rowIndex = 0): string {
	if (player.profileId != null) {
		return `profile:${player.profileId}`;
	}
	if (player.steamId) {
		return `steam:${player.steamId}`;
	}
	if (player.index != null) {
		return `index:${player.index}`;
	}
	return `row:${rowIndex}`;
}
