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

	const relicProfile = resource(
		() => page.params.id,
		async (id) => {
			if (!id) {
				throw new Error(t('Profile not found'));
			}
			const profile = isSteamId(id)
				? await relic.getProfileBySteamId(id)
				: await relic.getProfileById(parseInt(id, 10));
			if (!profile) {
				throw new Error(t('Profile not found'));
			}
			return profile;
		}
	);

	const steamId = $derived.by(() => {
		const id = page.params.id;
		if (id && isSteamId(id)) return id;
		const name = relicProfile.current?.name;
		return name ? name.replace('/steam/', '') : null;
	});

	const steamProfile = resource(
		() => steamId,
		async (id) => {
			if (!id) return null;
			const [user, game] = await Promise.all([
				steam.getUserProfile(id),
				steam.getRecentlyPlayedGameByAppId(id, 228200)
			]);
			if (!user) {
				throw new Error(t('Profile not found'));
			}
			return { user, game };
		}
	);

	const extras = resource(
		() => {
			const profile = relicProfile.current;
			const id = steamId;
			return profile && id ? `${id}:${profile.profile_id}` : null;
		},
		async (key) => {
			const profile = relicProfile.current;
			const id = steamId;
			if (!key || !profile || !id) {
				return null;
			}
			const [matchHistory, playerRating, cheater, smurf] = await Promise.all([
				relic.getRecentMatchHistoryForProfile(profile.profile_id, {
					includeHidden: true
				}),
				getPlayerRating(id),
				findCheaterBySteamId(id),
				loadSmurfAlert(id, profile.profile_id)
			]);
			return {
				key,
				matchHistory,
				playerRating,
				cheater: !!cheater,
				smurf
			};
		}
	);

	const extra = $derived.by(() => {
		const current = extras.current;
		const profile = relicProfile.current;
		const id = steamId;
		if (!current || !profile || !id) return null;
		if (current.key !== `${id}:${profile.profile_id}`) return null;
		return current;
	});

	const profile = $derived(relicProfile.current);
	const user = $derived(steamProfile.current?.user);
	const game = $derived(steamProfile.current?.game);

	const playerElo = $derived.by(() => {
		if (!profile || !user) return {};
		return mergeEloMaps(
			extra?.playerRating?.elo,
			eloMapForSteamId(extra?.matchHistory ?? [], user.steamid, profile.profile_id)
		);
	});

	const isSelf = $derived.by(() => {
		if (!profile || !user) return false;
		return (
			account.user.steamIds.includes(user.steamid) ||
			app.game.profile?.relic.profile_id === profile.profile_id
		);
	});

	export const snapshot: Snapshot<string> = {
		capture: () => currentTab,
		restore: (tab) => (currentTab = tab)
	};
</script>

<SetCrumbs items={[{ label: profile?.alias ?? t('Player') }]} />

{#if relicProfile.loading || steamProfile.loading || !profile || !user}
	<Player.ProfileSkeleton />
{:else if profile && user}
	<div class="border-secondary-900 overflow-clip border-b">
		<div
			class="border-secondary-800 grid grid-cols-1 border-b sm:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]"
		>
			<div
				class={cn(
					'border-secondary-800 aspect-square overflow-clip sm:aspect-auto sm:h-full sm:border-r',
					user.gameextrainfo?.trim() === 'Company of Heroes'
						? 'border-green-500'
						: user.personastate > 0
							? 'border-blue-400'
							: 'border-secondary-800'
				)}
			>
				<img src={user.avatarfull} alt={profile.alias} class="h-full w-full object-cover" />
			</div>

			<div class="min-w-0 px-6 py-4">
				<div class="mb-3 flex flex-wrap items-center gap-2.5">
					{#if profile.country}
						<img
							class="h-5 w-auto shrink-0 rounded-xs"
							src="https://flagsapi.com/{upperCase(profile.country)}/shiny/64.png"
							alt={profile.country}
						/>
					{/if}
					<span class="font-heading truncate text-3xl font-bold">{profile.alias}</span>
					<Player.Labels steamId={user.steamid} class="shrink-0" />
					<Player.LabelEditor
						steamId={user.steamid}
						profileId={profile.profile_id}
						alias={profile.alias}
						class="shrink-0"
					/>
					{#if extra}
						<SmurfAlert smurf={extra.smurf} />
						{#if extra.cheater}
							<CheaterAlert />
						{/if}
					{/if}
				</div>

				<PlayerPerformanceSummary
					profileId={profile.profile_id}
					steamId={user.steamid}
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
						stats={profile.leaderboardStats ?? []}
						elo={playerElo}
						class="rounded-none border-0"
					/>
				{:else if currentTab === 'performance'}
					<PlayerPerformance
						profileId={profile.profile_id}
						scope={isSelf ? 'user' : 'community'}
						userId={isSelf ? account.userId : undefined}
						empty={isSelf ? 'self' : 'other'}
						class="rounded-none border-0"
					/>
				{:else if currentTab === 'match-history'}
					{#if !extra}
						<Leaderboard stats={[]} loading skeletonRows={10} class="rounded-none border-0" />
					{:else}
						<MatchHistory matches={extra.matchHistory} showSessionId />
					{/if}
				{:else}
					<PlayerScreenshots
						steamId={user.steamid}
						userId={isSelf ? account.userId : undefined}
						profileId={profile.profile_id}
					/>
				{/if}
			</div>
		</div>

		<div
			class="text-secondary-400 bg-secondary-950/50 flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 text-sm"
		>
			{#if user.lastlogoff}
				<span>
					<span class="text-secondary-500">{t('Last seen')}</span>
					{dayjs.unix(user.lastlogoff).fromNow()}
				</span>
			{/if}
			{#if game?.playtime_forever}
				<span>
					<span class="text-secondary-500">{t('Playtime')}</span>
					{t('{hours} hours', { hours: (game.playtime_forever / 60).toFixed(0) })}
				</span>
			{/if}
			{#if game?.playtime_2weeks}
				<span>
					<span class="text-secondary-500">{t('Past 2 weeks')}</span>
					{t('{hours} hours', { hours: (game.playtime_2weeks / 60).toFixed(0) })}
				</span>
			{/if}
		</div>
	</div>
{/if}
