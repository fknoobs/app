<script lang="ts">
	import dayjs from '$lib/dayjs';
	import { Leaderboard } from '$lib/components/leaderboard';
	import { page } from '$app/state';
	import { steam } from '$core/steam';
	import { relic } from '$lib/relic';
	import { cn, isSteamId } from '$lib/utils';
	import { resource } from 'runed';
	import * as Player from '$lib/components/player';
	import { SetCrumbs } from '$lib/components/ui/breadcrumb';
	import { MatchHistory } from '$lib/components/match-history';
	import { PlayerPerformance, PlayerPerformanceSummary } from '$lib/components/player-performance';
	import SmurfAlert from '$lib/components/player/smurf-alert.svelte';
	import CheaterAlert from '$lib/components/player/cheater-alert.svelte';
	import PlayerScreenshots from '$lib/components/player/player-screenshots.svelte';
	import { loadSmurfAlert } from '$lib/player/smurf';
	import { findCheaterBySteamId } from '$core/pocketbase/anti-cheat';
	import { account } from '$core/account';
	import { app } from '$core/app/context';
	import { getPlayerRating } from '$core/pocketbase/player-ratings';
	import { eloMapForSteamId, mergeEloMaps } from '$lib/utils/player-elo';
	import { tabTrigger } from '$lib/components/ui/variants';
	import { upperCase } from 'lodash-es';
	import type { Snapshot } from '@sveltejs/kit';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	let currentTab = $state('stats');

	const profile = resource(
		() => page.params.id,
		async (id) => {
			const relicProfile = isSteamId(id!)
				? await relic.getProfileBySteamId(id!)
				: await relic.getProfileById(parseInt(id!, 10));

			if (!relicProfile) {
				throw new Error(t('Profile not found'));
			}

			const steamId = relicProfile.name.replace('/steam/', '');
			const [steamProfile, gamePlayTime, matchHistory, playerRating, cheater] = await Promise.all([
				steam.getUserProfile(steamId),
				steam.getRecentlyPlayedGameByAppId(steamId, 228200),
				relic.getRecentMatchHistoryForProfile(relicProfile.profile_id),
				getPlayerRating(steamId),
				findCheaterBySteamId(steamId)
			]);

			if (!steamProfile) {
				throw new Error(t('Profile not found'));
			}

			const smurf = await loadSmurfAlert(steamId, relicProfile.profile_id);

			return {
				relic: relicProfile,
				steam: steamProfile,
				steamId,
				game: gamePlayTime,
				matchHistory,
				smurf,
				playerRating,
				cheater: !!cheater
			};
		}
	);

	const playerElo = $derived.by(() => {
		const current = profile.current;
		if (!current) return {};

		return mergeEloMaps(
			current.playerRating?.elo,
			eloMapForSteamId(current.matchHistory, current.steam.steamid, current.relic.profile_id)
		);
	});

	const isSelf = $derived.by(() => {
		const current = profile.current;
		if (!current) return false;
		return (
			account.user.steamIds.includes(current.steam.steamid) ||
			app.game.profile?.relic.profile_id === current.relic.profile_id
		);
	});

	export const snapshot: Snapshot<string> = {
		capture: () => currentTab,
		restore: (tab) => (currentTab = tab)
	};
</script>

<SetCrumbs items={[{ label: profile.current?.relic.alias ?? t('Player') }]} />

{#if profile.loading}
	<Player.ProfileSkeleton />
{:else if profile.current}
	<div class="border-secondary-900 overflow-clip border-b">
		<div
			class="border-secondary-800 grid grid-cols-1 border-b sm:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]"
		>
			<div
				class={cn(
					'border-secondary-800 aspect-square overflow-clip sm:aspect-auto sm:h-full sm:border-r',
					profile.current.steam.gameextrainfo?.trim() === 'Company of Heroes'
						? 'border-green-500'
						: profile.current.steam.personastate > 0
							? 'border-blue-400'
							: 'border-secondary-800'
				)}
			>
				<img
					src={profile.current.steam.avatarfull}
					alt={profile.current.relic.alias}
					class="h-full w-full object-cover"
				/>
			</div>

			<div class="min-w-0 px-6 py-4">
				<div class="mb-3 flex flex-wrap items-center gap-2.5">
					{#if profile.current.relic.country}
						<img
							class="h-5 w-auto shrink-0 rounded-xs"
							src="https://flagsapi.com/{upperCase(profile.current.relic.country)}/shiny/64.png"
							alt={profile.current.relic.country}
						/>
					{/if}
					<span class="font-heading truncate text-3xl font-bold">{profile.current.relic.alias}</span
					>
					<Player.Labels steamId={profile.current.steamId} class="shrink-0" />
					<Player.LabelEditor
						steamId={profile.current.steamId}
						profileId={profile.current.relic.profile_id}
						alias={profile.current.relic.alias}
						class="shrink-0"
					/>
					<SmurfAlert smurf={profile.current.smurf} />
					{#if profile.current.cheater}
						<CheaterAlert />
					{/if}
				</div>

				<PlayerPerformanceSummary
					profileId={profile.current.relic.profile_id}
					steamId={profile.current.steam.steamid}
					scope={isSelf ? 'user' : 'community'}
					userId={isSelf ? account.userId : undefined}
					empty={isSelf ? 'self' : 'other'}
				/>
			</div>
		</div>

		<div class="border-secondary-800 border-b">
			<div class="flex items-center gap-2 px-4 py-2.5">
				<button
					type="button"
					class={tabTrigger}
					data-state={currentTab === 'stats' ? 'active' : undefined}
					onclick={() => (currentTab = 'stats')}
				>
					{t('Stats')}
				</button>
				<button
					type="button"
					class={tabTrigger}
					data-state={currentTab === 'performance' ? 'active' : undefined}
					onclick={() => (currentTab = 'performance')}
				>
					{t('Performance')}
				</button>
				<button
					type="button"
					class={tabTrigger}
					data-state={currentTab === 'match-history' ? 'active' : undefined}
					onclick={() => (currentTab = 'match-history')}
				>
					{t('Match history')}
				</button>
				<button
					type="button"
					class={tabTrigger}
					data-state={currentTab === 'screenshots' ? 'active' : undefined}
					onclick={() => (currentTab = 'screenshots')}
				>
					{t('Screenshots')}
				</button>
			</div>

			<div class="border-secondary-800 border-t">
				{#if currentTab === 'stats'}
					<Leaderboard
						stats={profile.current.relic.leaderboardStats ?? []}
						elo={playerElo}
						class="rounded-none border-0"
					/>
				{:else if currentTab === 'performance'}
					<PlayerPerformance
						profileId={profile.current.relic.profile_id}
						scope={isSelf ? 'user' : 'community'}
						userId={isSelf ? account.userId : undefined}
						empty={isSelf ? 'self' : 'other'}
						class="rounded-none border-0"
					/>
				{:else if currentTab === 'match-history'}
					<MatchHistory matches={profile.current.matchHistory} showSessionId />
				{:else}
					<PlayerScreenshots
						steamId={profile.current.steamId}
						userId={isSelf ? account.userId : undefined}
						profileId={profile.current.relic.profile_id}
					/>
				{/if}
			</div>
		</div>

		<div
			class="text-secondary-400 bg-secondary-950/50 flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 text-sm"
		>
			{#if profile.current.steam.lastlogoff}
				<span>
					<span class="text-secondary-500">{t('Last seen')}</span>
					{dayjs.unix(profile.current.steam.lastlogoff).fromNow()}
				</span>
			{/if}
			{#if profile.current.game?.playtime_forever}
				<span>
					<span class="text-secondary-500">{t('Playtime')}</span>
					{t('{hours} hours', { hours: (profile.current.game.playtime_forever / 60).toFixed(0) })}
				</span>
			{/if}
			{#if profile.current.game?.playtime_2weeks}
				<span>
					<span class="text-secondary-500">{t('Past 2 weeks')}</span>
					{t('{hours} hours', { hours: (profile.current.game.playtime_2weeks / 60).toFixed(0) })}
				</span>
			{/if}
		</div>
	</div>
{/if}
