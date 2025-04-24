import type { RelicProfile, LobbyPlayer } from '@fknoobs/app';

export class Game {
	isRunning = $state(false);

	steamId = $state<string>();

	profile = $state<RelicProfile>();

	lobby = $state<Lobby>();
}

export class Lobby {
	map = $state<string>();

	isStarted = $state(false);

	players = $state<LobbyPlayer[]>([]);

	outcome = $state<string>();
}
