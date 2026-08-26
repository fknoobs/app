<script lang="ts">
	import type { Snapshot } from '@sveltejs/kit';
	import * as Player from '$lib/components/player';
	import { Button } from '$lib/components/ui/button';
	import { Alert } from '$lib/components/ui/alert';
	import { Input } from '$lib/components/ui/input';
	import { relic } from '$lib/relic';
	import { steam } from '$core/steam';
	import { goto } from '$app/navigation';
	import { isProfileId, isSteamId } from '$lib/utils';
	import {
		mergeSteamProfiles,
		PlayersSearch,
		type PlayersSearchState
	} from './players-search.svelte';
	import { useI18n } from '$lib/i18n';

	let playersSearch = $state(new PlayersSearch());
	let loading = $state(false);
	const { t } = useI18n();

	async function search(event: SubmitEvent) {
		event.preventDefault();

		const trimmed = playersSearch.query.trim();
		if (!trimmed) {
			return;
		}

		loading = true;
		playersSearch.error = null;
		playersSearch.resetResults();

		try {
			if (isSteamId(trimmed) || isProfileId(trimmed)) {
				const profile = await relic.resolveProfile(trimmed);

				if (!profile) {
					playersSearch.error = t('Player not found');
					return;
				}

				await goto(`/players/${profile.profile_id}`);
				return;
			}

			const players = await relic.searchProfilesByName(trimmed);

			if (players.length === 0) {
				playersSearch.error = t('Player not found');
				return;
			}

			const steamIds = players.map((profile) => profile.name.replace('/steam/', ''));
			const steamProfiles = await steam.getUserProfiles(steamIds);
			playersSearch.results = mergeSteamProfiles(players, steamProfiles);

			if (playersSearch.results.length === 0) {
				playersSearch.error = t('Player not found');
			}
		} catch {
			playersSearch.error = t('Failed to search for player');
		} finally {
			loading = false;
		}
	}

	export const snapshot: Snapshot<PlayersSearchState> = {
		capture: () => playersSearch.capture(),
		restore: (state) => playersSearch.restore(state)
	};
</script>

<div class="border-secondary-800 border-b p-4">
	<p class="text-secondary-400 mb-4 text-sm">
		{t('Search for a player by Steam ID, profile ID, or in-game name.')}
	</p>

	<form class="flex flex-wrap items-center gap-3" onsubmit={search}>
		<Input
			id="player-search"
			type="text"
			placeholder={t('Steam ID, profile ID, or player name')}
			class="min-w-0 flex-1 sm:max-w-xl"
			bind:value={playersSearch.query}
			disabled={loading}
		/>
		<Button type="submit" {loading} disabled={!playersSearch.query.trim() || loading}>{t('Search')}</Button>
	</form>
</div>

{#if playersSearch.error}
	<div class="border-secondary-800 border-b px-4 py-3">
		<Alert variant="destructive">{playersSearch.error}</Alert>
	</div>
{/if}

{#if playersSearch.results.length > 0}
	<p class="text-secondary-400 border-secondary-800 border-b px-4 py-3 text-sm">
		{playersSearch.results.length === 1
			? t('{count} player found', { count: playersSearch.results.length })
			: t('{count} players found', { count: playersSearch.results.length })}
	</p>
	<div>
		{#each playersSearch.results as player (player.relic.profile_id)}
			<Player.SearchCard {player} />
		{/each}
	</div>
{/if}
