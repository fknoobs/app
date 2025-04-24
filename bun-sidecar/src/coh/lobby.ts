import { RelicProfile } from '../types';

export type Player = {
	index: number;
	playerId: number;
	type: number;
	team: number;
	race: number;
	profile?: RelicProfile;
};

export class Lobby {
	private isStarted = false;
	private map: string | null = null;
	private players: Player[] = [];
	private outcome: 'PS_WON' | 'PS_KILLED' | null = null;
	private matchType: 'BASIC_MATCH' | 'SKRIMISH' | 'AUTOMATCH' | null = null;

	addPlayer(player: Player) {
		this.players.push(player);
	}

	setMatchType(type: 'BASIC_MATCH' | 'SKRIMISH' | 'AUTOMATCH') {
		this.matchType = type;
	}

	setMap(map: string) {
		this.map = map;
	}

	setOutcome(outcome: 'PS_WON' | 'PS_KILLED') {
		this.outcome = outcome;
	}

	setIsStarted(started: boolean) {
		this.isStarted = started;
	}

	getIsStarted(): boolean {
		return this.isStarted;
	}

	getMap(): string | null {
		return this.map;
	}

	getPlayers(): Player[] {
		return this.players;
	}

	getPlayerIds(): number[] {
		return this.players.map((player) => player.playerId).filter((id) => id !== -1);
	}

	getOutcome(): 'PS_WON' | 'PS_KILLED' | null {
		return this.outcome;
	}

	toJSON() {
		return {
			isStarted: this.isStarted,
			map: this.map,
			players: this.players,
			outcome: this.outcome,
			matchType: this.matchType
		};
	}
}
