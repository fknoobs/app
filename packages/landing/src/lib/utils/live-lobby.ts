import { href, type TranslateFn } from '$lib/i18n';
import type { LiveLobbyRecord } from '$lib/services/live-lobbies.service';
import {
	getLiveLobbyMatchTypeId,
	type LiveLobby,
	type LiveLobbyPlayer
} from '@company-of-heroes/ui/live-lobby';
import { MATCH_TYPES } from '$lib/utils/player/format';
import { profileHref } from '$lib/utils/resolvers';

export function toLiveLobby(lobby: LiveLobbyRecord, t: TranslateFn): LiveLobby {
	return {
		...lobby,
		modeLabel: t(
			MATCH_TYPES[getLiveLobbyMatchTypeId(lobby.players, lobby.isRanked)] ?? 'Custom Game'
		)
	};
}

export function liveLobbyPlayerHref(player: LiveLobbyPlayer) {
	if (player.profileId) {
		return profileHref(player.profileId);
	}

	if (player.steamId) {
		return href(`/players/${player.steamId}`);
	}

	return null;
}

export function liveLobbyPlayerLabel(player: LiveLobbyPlayer, t: TranslateFn) {
	if (player.alias.trim()) {
		return player.alias;
	}

	if (player.playerId === -1) {
		return t('CPU opponent');
	}

	return t('Player {n}', { n: player.index + 1 });
}

export function liveLobbyDetailsHref(lobby: LiveLobby) {
	if (lobby.lobbyId) {
		return href(`/replays/${lobby.lobbyId}`);
	}

	return href(`/live/${lobby.id}`);
}
