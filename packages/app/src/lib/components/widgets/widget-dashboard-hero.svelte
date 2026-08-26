<script lang="ts">
	import { app } from '$core/app/context';
	import { Alert } from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Leaderboard, LeaderboardModeSummary } from '../leaderboard';
	import LeaderboardStatPill from '$lib/components/leaderboard/leaderboard-stat-pill.svelte';
	import { MatchHistory } from '../match-history';
	import { PlayerPerformance } from '$lib/components/player-performance';
	import { relic } from '$lib/relic';
	import { steam } from '$core/steam';
	import { cn, getFactionFlagFromRace } from '$lib/utils';
	import { interactive, statLosses, statWins } from '$lib/components/ui/variants';
	import { resource } from 'runed';
	import { upperCase } from 'lodash-es';
	import CaretDownIcon from 'phosphor-svelte/lib/CaretDownIcon';
	import * as Player from '$lib/components/player';
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
		type PerformanceRecentMatch
	} from '$core/pocketbase/player-performance';
	import { MATCH_TYPES } from '$core/game/lobby';
	import { getRaceLabel } from '$lib/components/leaderboard/leaderboard-utils';
	import { tooltip } from '$lib/attachments';

	let activeTab = $state('stats');
	let panelExpanded = $state(false);
	const { t } = useI18n();

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

	const todayMatches = resource(
		() => todaySteamIds.join(','),
		async (steamIdsKey) => {
			const ids = steamIdsKey ? steamIdsKey.split(',').filter(Boolean) : [];
			if (ids.length === 0) return [];
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

	const trackedPerformance = resource(
		() => [profileId, app.features.auth.userId] as const,
		async ([id, userId]) => {
			if (!id || !userId) return emptyPlayerPerformance();
			return getPlayerPerformance({
				profileId: id,
				scope: 'user',
				userId
			});
		},
		{ initialValue: emptyPlayerPerformance() }
	);
	const tracked = $derived(trackedPerformance.current ?? emptyPlayerPerformance());
	const formMatches = $derived(tracked.recentMatches ?? []);

	const recentMatchBase =
		'min-w-6 px-1.5 py-0.5 text-center font-semibold transition-colors duration-150';
	const recentMatchWin =
		'border-success/15 bg-success/5 text-success/45 group-hover:border-success/50 group-hover:bg-success/25 group-hover:text-green-300 group-focus-visible:border-success/50 group-focus-visible:bg-success/25 group-focus-visible:text-green-300';
	const recentMatchLoss =
		'border-destructive/15 bg-destructive/5 text-destructive/45 group-hover:border-destructive/50 group-hover:bg-destructive/25 group-hover:text-red-300 group-focus-visible:border-destructive/50 group-focus-visible:bg-destructive/25 group-focus-visible:text-red-300';

	function openTab(tab: string) {
		activeTab = tab;
		panelExpanded = true;
	}

	function tabClass(tab: string) {
		const selected = panelExpanded && activeTab === tab;
		return cn(
			interactive,
			'rounded-md px-4 py-1.5 font-bold transition-colors',
			selected ? 'bg-primary text-secondary-950' : 'text-white hover:bg-secondary-950/50'
		);
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
		if (match.raceId == null) return mode;
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
			<div class="border-secondary-800 flex items-center gap-3 border-b px-4 py-3">
				<img
					src={profile.steam.avatarfull}
					alt={profile.relic.alias}
					class={cn(
						'size-16 shrink-0 rounded-lg border-3 object-cover',
						app.lobby ? 'border-green-500' : 'border-gray-400'
					)}
				/>
				<a
					href="/players/{profile.relic.profile_id}"
					class={cn(
						interactive,
						'hover:text-primary flex min-w-0 flex-1 items-center gap-2 transition-colors'
					)}
				>
					{#if profile.relic.country}
						<img
							class="h-5 w-auto shrink-0 rounded-xs"
							src="https://flagsapi.com/{upperCase(profile.relic.country)}/shiny/64.png"
							alt={profile.relic.country}
						/>
					{/if}
					<span class="font-heading truncate text-xl font-bold">{profile.relic.alias}</span>
				</a>
				{#if app.lobby}
					<a
						href="/current-game"
						class={cn(interactive, 'text-success shrink-0 text-xs font-medium hover:underline')}
					>
						{t('In match')}
					</a>
				{:else if !app.game.isRunning}
					<span class="text-secondary-500 shrink-0 text-xs font-medium">{t('Not running')}</span>
				{/if}
			</div>

			<div class="border-secondary-800 border-b">
				<dl class="grid min-w-0 grid-cols-6 items-stretch text-center text-sm">
					<LeaderboardModeSummary stats={profile.relic.leaderboardStats ?? []} elo={playerElo} />
					<div
						class="border-secondary-800 flex h-full flex-col items-center justify-center border-r px-2 py-3"
					>
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
					<div class="flex h-full flex-col items-center justify-center px-2 py-3">
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
			</div>

			{#if formMatches.length > 0}
				<div class="border-secondary-800 flex gap-1 overflow-x-auto border-b px-4 py-2">
					{#each formMatches as match (match.id || match.sessionId)}
						<a
							href="/history/{match.id}"
							class={cn(interactive, 'group inline-flex shrink-0')}
							aria-label="{match.outcome === 1 ? t('Win') : t('Loss')} — {recentMatchLabel(match)}"
							{@attach tooltip(recentMatchTooltip(match))}
						>
							<Badge
								variant={match.outcome === 1 ? 'success' : 'destructive'}
								class={cn(recentMatchBase, match.outcome === 1 ? recentMatchWin : recentMatchLoss)}
							>
								{match.outcome === 1 ? t('W') : t('L')}
							</Badge>
						</a>
					{/each}
				</div>
			{/if}

			<div>
				<div class="flex items-center justify-between px-4 py-2.5">
					<div class="flex items-center gap-2">
						<button type="button" class={tabClass('stats')} onclick={() => openTab('stats')}>
							{t('Stats')}
						</button>
						<button
							type="button"
							class={tabClass('performance')}
							onclick={() => openTab('performance')}
						>
							{t('Performance')}
						</button>
						<button
							type="button"
							class={tabClass('recent-games')}
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
