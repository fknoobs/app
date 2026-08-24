<script lang="ts">
	import * as Profile from '$lib/components/ui/profile';
	import { app } from '$core/app/context';
	import { Alert } from '$lib/components/ui/alert';
	import { Leaderboard } from '../leaderboard';
	import { MatchHistory } from '../match-history';
	import { PlayerPerformance, PlayerPerformanceSummary } from '$lib/components/player-performance';
	import * as List from '$lib/components/ui/list';
	import { relic } from '$lib/relic';
	import { steam } from '$core/steam';
	import { cn } from '$lib/utils';
	import { interactive, statLosses, statWins } from '$lib/components/ui/variants';
	import { resource } from 'runed';
	import { upperCase } from 'lodash-es';
	import CaretDownIcon from 'phosphor-svelte/lib/CaretDownIcon';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import {
		collectTodayMatchSteamIds,
		countTodayRecord,
		isMatchFromLocalToday,
		matchIncludesSteamIds,
		todayStartFilterValue
	} from './dashboard-utils';
	import { getPlayerRating } from '$core/pocketbase/player-ratings';
	import { eloMapForSteamId, mergeEloMaps } from '$lib/utils/player-elo';

	let activeTab = $state('stats');
	let panelExpanded = $state(false);

	const steamId = $derived(
		app.game.profile?.steam.steamid ?? app.features.auth.user.steamIds[0] ?? null
	);

	const resolvedProfile = resource(
		() => [app.game.profile ?? null, steamId] as const,
		async ([live, id]) => {
			if (live) return live;
			if (!id) return null;
			const [relicProfile, steamProfile] = await Promise.all([
				relic.getProfileBySteamId(id),
				steam.getUserProfile(id)
			]);
			if (!relicProfile || !steamProfile) return null;
			return { relic: relicProfile, steam: steamProfile };
		}
	);

	const profile = $derived(app.game.profile ?? resolvedProfile.current ?? null);
	const profileId = $derived(profile?.relic.profile_id ?? null);
	const todaySteamIds = $derived(collectTodayMatchSteamIds(app.features.auth.user.steamIds));
	const userId = $derived(app.features.auth.userId ?? null);

	const todayMatches = resource(
		() => [userId, todaySteamIds.join(',')] as const,
		async ([id, steamIdsKey]) => {
			if (!id) return [];
			const ids = steamIdsKey ? steamIdsKey.split(',').filter(Boolean) : [];
			const items = await app.database.matches.getTodayMatches(id, todayStartFilterValue());
			return items.filter(
				(match) => isMatchFromLocalToday(match) && matchIncludesSteamIds(match, ids)
			);
		}
	);

	const replays = resource(
		() => app.features.auth.userId,
		() =>
			app.database.replays.getPaginated(1, 1, {
				filter: `createdBy = "${app.features.auth.userId}"`
			})
	);

	const recentMatches = resource(
		() => profileId,
		(id) => relic.getRecentMatchHistoryForProfile(id!),
		{ initialValue: [] }
	);

	const todayRecord = $derived(
		countTodayRecord(todayMatches.current ?? [], profileId ?? undefined, todaySteamIds)
	);

	const storedRating = resource(
		() => steamId,
		async (id) => (id ? getPlayerRating(id) : null)
	);
	const playerElo = $derived(
		mergeEloMaps(
			storedRating.current?.elo,
			steamId ? eloMapForSteamId(recentMatches.current, steamId) : undefined
		)
	);

	function openTab(tab: string) {
		activeTab = tab;
		panelExpanded = true;
	}

	function tabClass(tab: string) {
		return cn(
			interactive,
			'rounded-md px-4 py-1.5 font-bold transition-colors',
			activeTab === tab ? 'bg-primary text-secondary-950' : 'text-white hover:bg-secondary-950/50'
		);
	}
</script>

{#if profile}
	{#key profile.relic.profile_id}
		<Profile.Root {profile}>
			<div
				class={cn(
					'border-secondary-900 overflow-clip border-b',
					'hover:border-secondary-700 transition-colors'
				)}
			>
				<div class="border-secondary-800 flex gap-4 border-b p-4">
					<img
						src={profile.steam.avatarfull}
						alt={profile.relic.alias}
						class={cn(
							'size-40 shrink-0 rounded-xl border-3 object-cover sm:size-44',
							app.lobby ? 'border-green-500' : 'border-gray-400'
						)}
					/>

					<div class="min-w-0 grow py-1">
						<div class="mb-3 flex flex-wrap items-center gap-2.5">
							<a
								href="/players/{profile.relic.profile_id}"
								class={cn(
									interactive,
									'hover:text-primary flex min-w-0 items-center gap-2.5 transition-colors'
								)}
							>
								{#if profile.relic.country}
									<img
										class="h-5 w-auto shrink-0 rounded-xs"
										src="https://flagsapi.com/{upperCase(profile.relic.country)}/shiny/64.png"
										alt={profile.relic.country}
									/>
								{/if}
								<span class="font-heading truncate text-3xl font-bold">{profile.relic.alias}</span>
							</a>
							{#if app.lobby}
								<a
									href="/current-game"
									class={cn(interactive, 'text-success text-xs font-medium hover:underline')}
								>
									In match
								</a>
							{:else if !app.game.isRunning}
								<span class="text-secondary-500 text-xs font-medium">Not running</span>
							{/if}
						</div>

						<PlayerPerformanceSummary
							profileId={profile.relic.profile_id}
							scope="user"
							userId={app.features.auth.userId}
							empty="self"
						>
							{#snippet meta()}
								<List.Title>Steam ID:</List.Title>
								<List.Value>
									<Profile.Steamid />
								</List.Value>
								<List.Title>Created:</List.Title>
								<List.Value>
									<Profile.Created />
								</List.Value>
							{/snippet}
						</PlayerPerformanceSummary>
					</div>
				</div>

				<div class="border-secondary-800 border-b">
					<div class="flex items-center justify-between px-4 py-2.5">
						<div class="flex items-center gap-2">
							<button type="button" class={tabClass('stats')} onclick={() => openTab('stats')}>
								Stats
							</button>
							<button
								type="button"
								class={tabClass('performance')}
								onclick={() => openTab('performance')}
							>
								Performance
							</button>
							<button
								type="button"
								class={tabClass('recent-games')}
								onclick={() => openTab('recent-games')}
							>
								Recent games
							</button>
						</div>
						<button
							type="button"
							class={cn(interactive, 'text-secondary-400 hover:text-primary p-1 transition-colors')}
							aria-expanded={panelExpanded}
							aria-label={panelExpanded ? 'Collapse panel' : 'Expand panel'}
							onclick={() => (panelExpanded = !panelExpanded)}
						>
							<CaretDownIcon
								class={cn('size-4 transition-transform', panelExpanded && 'rotate-180')}
							/>
						</button>
					</div>

					{#if panelExpanded}
						<div class="border-secondary-800 border-t">
							{#if activeTab === 'stats'}
								<Leaderboard
									stats={profile.relic.leaderboardStats ?? []}
									elo={playerElo}
									class="rounded-none border-0"
								/>
							{:else if activeTab === 'performance'}
								<PlayerPerformance
									profileId={profile.relic.profile_id}
									scope="user"
									userId={app.features.auth.userId}
									empty="self"
									class="rounded-none border-0"
								/>
							{:else if recentMatches.loading}
								<div class="px-4 py-3">
									<Skeleton class="h-32 w-full" />
								</div>
							{:else}
								<MatchHistory matches={recentMatches.current ?? []} showSessionId />
							{/if}
						</div>
					{/if}
				</div>

				<div class="text-secondary-400 flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 text-sm">
					<span>
						<span class="text-secondary-500">Today</span>
						{todayRecord.total} matches
					</span>
					{#if todayRecord.wins + todayRecord.losses > 0}
						<span>
							<span class={statWins}>{todayRecord.wins}W</span>
							<span class="text-secondary-600"> · </span>
							<span class={statLosses}>{todayRecord.losses}L</span>
						</span>
					{:else if todayRecord.pending > 0}
						<span>{todayRecord.pending} pending</span>
					{/if}
					{#if replays.current}
						<a href="/replays" class="hover:text-primary transition-colors">
							{replays.current.totalItems} replays
						</a>
					{/if}
					{#if app.notifications.unreadCount > 0}
						<span class="text-warning">{app.notifications.unreadCount} unread</span>
					{/if}
				</div>
			</div>
		</Profile.Root>
	{/key}
{:else if resolvedProfile.loading}
	<Skeleton class="h-48 w-full" />
{:else}
	<Alert variant="warning">
		Company of Heroes is not running. Start the game to see your profile and match tracking.
	</Alert>
{/if}
