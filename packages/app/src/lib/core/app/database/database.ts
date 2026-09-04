import { Matches } from './matches';
import { Replays } from './replays';
import { LobbiesLive } from './lobbies-live';
import { Notifications } from './notifications';
import { MatchSocial } from './match-social';
import { PlayerSocial } from './player-social';

export class Database {
	public matches = new Matches();
	public replays = new Replays();
	public lobbiesLive = new LobbiesLive();
	public notifications = new Notifications();
	public matchSocial = new MatchSocial();
	public playerSocial = new PlayerSocial();
}

export const database = new Database();
