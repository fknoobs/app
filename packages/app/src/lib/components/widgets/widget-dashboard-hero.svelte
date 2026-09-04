<script lang="ts">
	import { app } from '$core/app/context';
	import { Alert } from '$lib/components/ui/alert';
	import { Leaderboard, LeaderboardModeSummary } from '../leaderboard';
	import LeaderboardStatPill from '$lib/components/leaderboard/leaderboard-stat-pill.svelte';
	import { MatchHistory } from '../match-history';
	import { PlayerPerformance } from '$lib/components/player-performance';
	import { relic, relicLeaderboardFingerprint } from '$lib/relic';
	import { steam } from '$core/steam';
	import { cn, getFactionFlagFromRace } from '$lib/utils';
	import { interactive, statLosses, statWins, tabTrigger } from '$lib/components/ui/variants';
	import { resource, watch } from 'runed';
	import { onDestroy } from 'svelte';
	import type { UnsubscribeFunc } from 'pocketbase';
	import { fetch } from '$core/http/fetch';
	import { exp } from '$core/pocketbase';
	import type { Match as LobbyMatch, MatchExpanded } from '$core/app/database/matches';
	import { upperCase } from 'lodash-es';
	import CaretDownIcon from 'phosphor-svelte/lib/CaretDownIcon';
	import * as Player from '$lib/components/player';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import {
		collectTodayMatchSteamIds,
		countTodayRecord,
		isMatchFromLocalToday,
		matchIncludesSteamIds,
		todayPlayedMatchesFilter
	} from './dashboard-utils';
	import { getPlayerRating } from '$core/pocketbase/player-ratings';
	import { eloMapForSteamId, mergeEloMaps } from '$lib/utils/player-elo';
	import { useI18n } from '$lib/i18n';
	import {
		emptyPlayerPerformance,
		getPlayerPerformance,
		invalidatePlayerPerformanceCache,
		type PerformanceRecentMatch
	} from '$core/pocketbase/player-performance';
	import { MATCH_TYPES } from '$core/game/lobby';
	import { getRaceLabel } from '$lib/components/leaderboard/leaderboard-utils';
	import { tooltip } from '$lib/attachments';
	import { resolve } from '$app/paths';

	let activeTab = $state('stats');
	let panelExpanded = $state(false);
	let statsGeneration = $state(0);
	let unsubscribeToday = $state<UnsubscribeFunc>();
	let subscribeGeneration = 0;
	let bumpTimer: ReturnType<typeof setTimeout> | null = null;
	const { t } = useI18n();

	const steamId = $derived(
		app.game.profile?.steam.steamid ?? app.features.auth.user.steamIds[0] ?? null
	);

	const resolvedProfile = resource(
		() => [app.game.profile ?? null, steamId] as const,
		async ([live, id]) => {
			if (live) {
				return live;
			}

			if (!id) {
				return null;
			}

			const [relicProfile, steamProfile] = await Promise.all([
				relic.getProfileBySteamId(id),
				steam.getUserProfile(id)
			]);
			if (!relicProfile || !steamProfile) {
				return null;
			}

			return { relic: relicProfile, steam: steamProfile };
		}
	);

	const profile = $derived(app.game.profile ?? resolvedProfile.current ?? null);
	const profileId = $derived(profile?.relic.profile_id ?? null);
	const todaySteamIds = $derived(collectTodayMatchSteamIds(app.features.auth.user.steamIds));

	function bumpStats() {
		invalidatePlayerPerformanceCache(profileId ?? undefined);
		if (bumpTimer) {
			clearTimeout(bumpTimer);
		}

		bumpTimer = setTimeout(() => {
			bumpTimer = null;
			statsGeneration += 1;
		}, 300);
	}

	const offLobbySaved = app.on('lobby.saved', bumpStats);
	const offMatchResult = app.on('match.result', bumpStats);
	const offLobbyDestroyed = app.on('lobby.destroyed', bumpStats);

	const todayMatches = resource(
		() => [todaySteamIds.join(','), statsGeneration] as const,
		async ([steamIdsKey]) => {
			const ids = steamIdsKey ? steamIdsKey.split(',').filter(Boolean) : [];
			if (ids.length === 0) {
				return [];
			}

			const items = await app.database.matches.getList({
				filter: todayPlayedMatchesFilter(ids),
				sort: '-createdAt'
			});
			return items.filter(
				(match) => isMatchFromLocalToday(match) && matchIncludesSteamIds(match, ids)
			);
		}
	);

	const recentMatches = resource(
		() => [profileId, statsGeneration] as const,
		async ([id]) => (id ? relic.getRecentMatchHistoryForProfile(id) : []),
		{ initialValue: [] }
	);

	const todayRecord = $derived(
		countTodayRecord(todayMatches.current ?? [], profileId ?? undefined, todaySteamIds)
	);

	const storedRating = resource(
		() => [steamId, statsGeneration] as const,
		async ([id]) => (id ? getPlayerRating(id) : null)
	);
	const playerElo = $derived(
		mergeEloMaps(
			storedRating.current?.elo,
			steamId ? eloMapForSteamId(recentMatches.current, steamId) : undefined
		)
	);

	const trackedPerformance = resource(
		() => [profileId, app.features.auth.userId, statsGeneration] as const,
		async ([id, userId, generation]) => {
			if (!id || !userId) {
				return emptyPlayerPerformance();
			}

			return getPlayerPerformance({
				profileId: id,
				scope: 'user',
				userId,
				fresh: generation > 0
			});
		},
		{ initialValue: emptyPlayerPerformance() }
	);
	const tracked = $derived(trackedPerformance.current ?? emptyPlayerPerformance());
	const formMatches = $derived(tracked.recentMatches ?? []);

	watch(
		() => relicLeaderboardFingerprint(profile?.relic.leaderboardStats),
		(next, previous) => {
			if (previous && next !== previous) {
				bumpStats();
			}
		}
	);

	watch(
		() => todaySteamIds.join(','),
		(steamIdsKey) => {
			const ids = steamIdsKey ? steamIdsKey.split(',').filter(Boolean) : [];
			const generation = ++subscribeGeneration;
			void (async () => {
				await unsubscribeToday?.();
				if (generation !== subscribeGeneration) {
					return;
				}

				unsubscribeToday = undefined;
				if (ids.length === 0) {
					return;
				}

				const next = await app.pocketbase.collection('lobbies').subscribe<LobbyMatch>(
					'*',
					(e) => {
						const match = exp(e.record) as MatchExpanded;
						if (!isMatchFromLocalToday(match) || !matchIncludesSteamIds(match, ids)) {
							return;
						}

						if (e.action === 'create') {
							const current = todayMatches.current || [];
							if (!current.find((entry) => entry.id === e.record.id)) {
								todayMatches.mutate([...current, match]);
							}
						} else if (e.action === 'update') {
							todayMatches.mutate(
								(todayMatches.current || []).map((entry) =>
									entry.id === e.record.id ? match : entry
								)
							);
							if (!match.needsResult) {
								bumpStats();
							}
						} else if (e.action === 'delete') {
							todayMatches.mutate(
								(todayMatches.current || []).filter((entry) => entry.id !== e.record.id)
							);
						}
					},
					{
						filter: todayPlayedMatchesFilter(ids),
						sort: '-createdAt',
						fetch
					}
				);

				if (generation !== subscribeGeneration) {
					await next();
					return;
				}

				unsubscribeToday = next;
			})();
		}
	);

	onDestroy(() => {
		subscribeGeneration += 1;
		if (bumpTimer) {
			clearTimeout(bumpTimer);
		}

		unsubscribeToday?.();
		offLobbySaved();
		offMatchResult();
		offLobbyDestroyed();
	});

	const statCell =
		'border-secondary-800 flex h-full flex-col items-center justify-center px-2 py-3 text-center';
	const recentMatchBase =
		'flex h-8 min-w-0 items-center justify-center text-xs font-semibold transition-colors duration-150';
	const recentMatchWin =
		'bg-success/20 text-success hover:bg-success/35 hover:text-green-300 focus-visible:bg-success/35 focus-visible:text-green-300';
	const recentMatchLoss =
		'bg-destructive/20 text-destructive hover:bg-destructive/35 hover:text-red-300 focus-visible:bg-destructive/35 focus-visible:text-red-300';

	function openTab(tab: string) {
		activeTab = tab;
		panelExpanded = true;
	}

	function modeLabel(matchtypeId: number): string {
		return (
			MATCH_TYPES[matchtypeId as keyof typeof MATCH_TYPES] ?? t('Mode {id}', { id: matchtypeId })
		);
	}

	function recentMatchLabel(match: PerformanceRecentMatch): string {
		const faction = match.raceId != null ? getRaceLabel(match.raceId) : t('Unknown');
		const mode = match.matchtypeId != null ? modeLabel(match.matchtypeId) : t('Unknown');
		return `${faction} · ${mode}`;
	}

	function recentMatchTooltip(match: PerformanceRecentMatch): string {
		const mode = match.matchtypeId != null ? modeLabel(match.matchtypeId) : t('Unknown');
		if (match.raceId == null) {
			return mode;
		}

		return `<span class="inline-flex items-center gap-1.5 leading-none"><span class="inline-flex p-[3px]"><img src="${getFactionFlagFromRace(match.raceId)}" alt="" class="ring-secondary-800 h-5 w-5 shrink-0 rounded-full object-cover ring-3" /></span>${mode}</span>`;
	}
</script>

{#if profile}
	{#key profile.relic.profile_id}
		<div
			class={cn(
				'border-secondary-900 overflow-clip border-b',
				'hover:border-secondary-700 transition-colors'
			)}
		>
			<div class="border-secondary-800 border-b">
				<div class="flex items-center gap-3 px-4 py-3">
					<a
						href={resolve('/(loaded)/players/[id]', { id: String(profile.relic.profile_id) })}
						class={cn(interactive, 'shrink-0')}
					>
						<img
							src={profile.steam.avatarfull}
							alt={profile.relic.alias}
							class={cn(
								'size-10 rounded-full object-cover ring-2',
								app.lobby ? 'ring-green-500' : 'ring-secondary-600'
							)}
						/>
					</a>
					<div class="flex min-w-0 flex-1 items-center gap-2">
						<a
							href={resolve('/(loaded)/players/[id]', { id: String(profile.relic.profile_id) })}
							class={cn(
								interactive,
								'hover:text-primary flex min-w-0 items-center gap-2 transition-colors'
							)}
						>
							{#if profile.relic.country}
								<img
									class="h-5 w-auto shrink-0 rounded-xs"
									src="https://flagsapi.com/{upperCase(profile.relic.country)}/shiny/64.png"
									alt={profile.relic.country}
								/>
							{/if}
							<Player.LikeCount steamId={profile.steam.steamid} class="shrink-0" />
							<span class="font-heading truncate text-lg font-bold">{profile.relic.alias}</span>
						</a>
						<Player.Labels steamId={profile.steam.steamid} class="shrink-0" />
						{#if app.lobby}
							<a
								href={resolve('/(loaded)/current-game')}
								class={cn(interactive, 'ml-auto shrink-0')}
							>
								<Badge variant="success">{t('In match')}</Badge>
							</a>
						{:else if !app.game.isRunning}
							<Badge variant="default" class="ml-auto shrink-0">{t('Not running')}</Badge>
						{/if}
					</div>
				</div>

				<dl class="border-secondary-800 grid min-w-0 grid-cols-6 border-t">
					<LeaderboardModeSummary stats={profile.relic.leaderboardStats ?? []} elo={playerElo} />
					<div class={cn(statCell, 'border-r')}>
						<dt class="text-secondary-500 text-xs font-medium uppercase">{t('Record')}</dt>
						<dd class="mt-1">
							{#if tracked.matchCount > 0}
								<span class="inline-flex flex-wrap items-center justify-center gap-1.5">
									<span class={statWins}>{t('{count}W', { count: tracked.wins })}</span>
									<span class="text-secondary-600">·</span>
									<span class={statLosses}>{t('{count}L', { count: tracked.losses })}</span>
									<LeaderboardStatPill
										type="ratio"
										wins={tracked.wins}
										losses={tracked.losses}
										streak={0}
									/>
								</span>
							{:else}
								<span class="text-secondary-500 line-clamp-2 text-xs">
									{t('Play with the companion running to build stats.')}
								</span>
							{/if}
						</dd>
					</div>
					<div class={statCell}>
						<dt class="text-secondary-500 text-xs font-medium uppercase">{t('Today')}</dt>
						<dd class="mt-1 flex items-center gap-1.5">
							{#if todayRecord.wins + todayRecord.losses > 0}
								<span class={statWins}>{t('{count}W', { count: todayRecord.wins })}</span>
								<span class="text-secondary-600">·</span>
								<span class={statLosses}>{t('{count}L', { count: todayRecord.losses })}</span>
							{:else if todayRecord.pending > 0}
								<span class="text-secondary-500 text-xs">
									{t('{count} pending', { count: todayRecord.pending })}
								</span>
							{/if}
							<span class="text-secondary-200 tabular-nums">({todayRecord.total})</span>
						</dd>
					</div>
				</dl>

				{#if formMatches.length > 0}
					<div
						class="border-secondary-800 divide-secondary-800 grid divide-x overflow-clip border-t"
						style:grid-template-columns="repeat({formMatches.length}, minmax(0, 1fr))"
					>
						{#each formMatches as match (match.id || match.sessionId)}
							<a
								href={resolve('/(loaded)/history/[id]', { id: match.id })}
								class={cn(
									interactive,
									recentMatchBase,
									match.outcome === 1 ? recentMatchWin : recentMatchLoss
								)}
								aria-label="{match.outcome === 1 ? t('Win') : t('Loss')} — {recentMatchLabel(
									match
								)}"
								{@attach tooltip(recentMatchTooltip(match))}
							>
								{match.outcome === 1 ? t('W') : t('L')}
							</a>
						{/each}
					</div>
				{/if}
			</div>

			<div>
				<div class="flex items-center justify-between px-4 py-2.5">
					<div class="flex items-center gap-2">
						<button
							type="button"
							class={tabTrigger}
							data-state={panelExpanded && activeTab === 'stats' ? 'active' : undefined}
							onclick={() => openTab('stats')}
						>
							{t('Stats')}
						</button>
						<button
							type="button"
							class={tabTrigger}
							data-state={panelExpanded && activeTab === 'performance' ? 'active' : undefined}
							onclick={() => openTab('performance')}
						>
							{t('Performance')}
						</button>
						<button
							type="button"
							class={tabTrigger}
							data-state={panelExpanded && activeTab === 'recent-games' ? 'active' : undefined}
							onclick={() => openTab('recent-games')}
						>
							{t('Recent games')}
						</button>
					</div>
					<button
						type="button"
						class={cn(interactive, 'text-secondary-400 hover:text-primary p-1 transition-colors')}
						aria-expanded={panelExpanded}
						aria-label={panelExpanded ? t('Collapse panel') : t('Expand panel')}
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
								refreshKey={statsGeneration}
								empty="self"
								class="rounded-none border-0"
							/>
						{:else if recentMatches.loading}
							<div class="divide-secondary-800 border-secondary-800 divide-y border-t">
								{#each Array(5) as _, index (index)}
									<div class="px-4 py-3">
										<Skeleton class="h-4 w-full" />
									</div>
								{/each}
							</div>
						{:else}
							<MatchHistory matches={recentMatches.current ?? []} showSessionId />
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/key}
{:else if resolvedProfile.loading}
	<Player.ProfileSkeleton widget />
{:else}
	<Alert variant="warning">
		{t('Company of Heroes is not running. Start the game to see your profile and match tracking.')}
	</Alert>
{/if}
