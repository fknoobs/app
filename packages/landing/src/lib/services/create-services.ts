import type PocketBase from 'pocketbase';
import { AuthService } from './auth.service';
import { HiddenMatchesService } from './hidden-matches.service';
import { LeaderboardsService } from './leaderboards.service';
import { LiveLobbiesService } from './live-lobbies.service';
import { MatchSocialService } from './match-social.service';
import { PlayerSocialService } from './player-social.service';
import { PlayersService } from './players.service';
import { ReplaysService } from './replays.service';
import { TwitchService } from './twitch.service';

export type ServiceDeps = {
	pocketbase: PocketBase;
	fetch: typeof fetch;
};

export type Services = {
	auth: () => AuthService;
	hiddenMatches: () => HiddenMatchesService;
	leaderboards: () => LeaderboardsService;
	liveLobbies: () => LiveLobbiesService;
	matchSocial: () => MatchSocialService;
	playerSocial: () => PlayerSocialService;
	players: () => PlayersService;
	replays: () => ReplaysService;
	twitch: () => TwitchService;
};

export function createServices(deps: ServiceDeps): Services {
	let auth: AuthService | undefined;
	let hiddenMatches: HiddenMatchesService | undefined;
	let leaderboards: LeaderboardsService | undefined;
	let liveLobbies: LiveLobbiesService | undefined;
	let matchSocial: MatchSocialService | undefined;
	let playerSocial: PlayerSocialService | undefined;
	let players: PlayersService | undefined;
	let replays: ReplaysService | undefined;
	let twitch: TwitchService | undefined;

	return {
		auth: () => (auth ??= new AuthService(deps.pocketbase)),
		hiddenMatches: () => (hiddenMatches ??= new HiddenMatchesService(deps.pocketbase)),
		leaderboards: () => (leaderboards ??= new LeaderboardsService(deps.fetch)),
		liveLobbies: () => (liveLobbies ??= new LiveLobbiesService(deps.fetch)),
		matchSocial: () => (matchSocial ??= new MatchSocialService(deps.pocketbase)),
		playerSocial: () => (playerSocial ??= new PlayerSocialService(deps.pocketbase)),
		players: () => (players ??= new PlayersService(deps.fetch)),
		replays: () => (replays ??= new ReplaysService(deps.fetch, deps.pocketbase)),
		twitch: () => (twitch ??= new TwitchService(deps.fetch))
	};
}
