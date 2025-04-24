import EventEmitter from 'eventemitter3';
import { RelicProfile } from '../types';
import { server } from '../server';
import { Lobby } from './lobby';

export type CoHMaps =
	| '2p_angoville farms'
	| '2p_beach_assault'
	| '2p_beaux lowlands'
	| '2p_bernieres-sur-mer'
	| '2p_best'
	| '2p_carpiquet'
	| '2p_circle_wall'
	| '2p_flooded_plains'
	| '2p_langres'
	| '2p_lyon'
	| '2p_semois'
	| '2p_st_mere_dumont'
	| '2p_sturzdorf'
	| '2p_verrieres_ridge'
	| '2p_verrieres_ridge_no_bunkers'
	| '2p_wrecked_train'
	| '2p_duclair'
	| '2p_egletons'
	| '2p_industrial riverbed'
	| '2p_ruins of rouen'
	| '4p_alsace moselle'
	| '4p_duclair'
	| '4p_road to montherme'
	| '6p_red_ball_express'
	| '6p_vimoutiers'
	| '4p_achelous river'
	| '4p_bedum'
	| '4p_coastal_harbour'
	| '4p_ecliptic fields'
	| '4p_etavaux'
	| '4p_linden'
	| '4p_lorraine'
	| '4p_lyon'
	| '4p_mcgechaens war'
	| '4p_point_du_hoc'
	| '4p_rails and metal'
	| '4p_st hilaire'
	| '4p_vire river valley'
	| '4p_wolfheze'
	| '6p_close_river_combat'
	| '6p_drekplaats'
	| '6p_hedgerow_siege'
	| '6p_hill 331'
	| '6p_montherme'
	| '6p_refinery'
	| '6p_seine_river_docks'
	| '6p_villers_bocage'
	| '8p_best'
	| '8p_king_of_the_hill'
	| '8p_montargis region'
	| '8p_route_n13'
	| '8p_steel_pact';

export type GameEvents = {
	'GAME:LAUNCHED': (game: Game) => void;
	'GAME:CLOSED': () => void;
	'LOBBY:STARTED': (lobby: Lobby) => void;
	'LOBBY:ENDED': (lobby: Lobby) => void;
};

export class Game extends EventEmitter<GameEvents> {
	private isRunning: boolean = false;

	private steamId: string | BigInt | null = null;

	private profile: RelicProfile | null = null;

	private lobby: Lobby = new Lobby();

	constructor() {
		super();

		this.addListener('GAME:LAUNCHED', () => {
			server.publish('game', JSON.stringify({ type: 'GAME:LAUNCHED', data: this.toJSON() }));
		});

		this.addListener('LOBBY:STARTED', () => {
			server.publish('game', JSON.stringify({ type: 'LOBBY:STARTED', data: this.lobby.toJSON() }));
		});

		this.addListener('LOBBY:ENDED', () => {
			server.publish('game', JSON.stringify({ type: 'LOBBY:ENDED', data: this.lobby.toJSON() }));
		});
	}

	setProfile(profile: RelicProfile) {
		this.profile = profile;
	}

	getProfile(): RelicProfile | null {
		return this.profile;
	}

	getProfileProperty<K extends keyof RelicProfile>(key: K): RelicProfile[K] | null {
		if (!this.profile) {
			return null;
		}

		return this.profile[key];
	}

	setIsRunning(isRunning: boolean) {
		this.isRunning = isRunning;
	}

	getIsRunning(): boolean {
		return this.isRunning;
	}

	setSteamId(steamId: string | BigInt) {
		this.steamId = steamId;
	}

	getSteamId(): string | BigInt | null {
		return this.steamId;
	}

	setLobby(lobby: Lobby) {
		this.lobby = lobby;
	}

	getLobby(): Lobby {
		return this.lobby;
	}

	toJSON() {
		return {
			isRunning: this.isRunning,
			profile: this.profile,
			steamId: this.steamId?.toString()
		};
	}
}
