<script lang="ts">
	import type { Match as LobbyMatch, MatchExpanded } from '$core/app/database/matches';
	import type { UnsubscribeFunc } from 'pocketbase';
	import { fetch } from '$core/http/fetch';
	import { app } from '$core/app/context';
	import { exp } from '$core/pocketbase';
	import { resource, watch } from 'runed';
	import { onDestroy } from 'svelte';
	import { H } from '../ui/h';
	import { Button } from '../ui/button';
	import { cn } from '$lib/utils';
	import TodayMatchesTable from './today-matches-table.svelte';
	import {
		collectTodayMatchSteamIds,
		isMatchFromLocalToday,
		matchIncludesSteamIds,
		todayPlayedMatchesFilter,
		todayStartFilterValue
	} from './dashboard-utils';

	let unsubscribe = $state<UnsubscribeFunc>();
	let subscribeGeneration = 0;
	const steamIds = $derived(collectTodayMatchSteamIds(app.features.auth.user.steamIds));
	const userId = $derived(app.features.auth.userId ?? null);
	let matches = resource(
		() => [userId, steamIds.join(',')] as const,
		async ([id, steamIdsKey]) => {
			if (!id) return [];
			const ids = steamIdsKey ? steamIdsKey.split(',').filter(Boolean) : [];
			const items = await app.database.matches.getTodayMatches(id, todayStartFilterValue());
			return items.filter(
				(match) => isMatchFromLocalToday(match) && matchIncludesSteamIds(match, ids)
			);
		}
	);

	const matchCount = $derived(matches.current?.length ?? 0);

	watch(
		() => [userId, steamIds.join(',')] as const,
		([id, steamIdsKey]) => {
			const ids = steamIdsKey ? steamIdsKey.split(',').filter(Boolean) : [];
			const generation = ++subscribeGeneration;
			void (async () => {
				await unsubscribe?.();
				if (generation !== subscribeGeneration) return;
				unsubscribe = undefined;
				if (!id || ids.length === 0) return;

				const next = await app.pocketbase.collection('lobbies').subscribe<LobbyMatch>(
					'*',
					(e) => {
						const match = exp(e.record) as MatchExpanded;
						if (!isMatchFromLocalToday(match) || !matchIncludesSteamIds(match, ids)) {
							return;
						}
						if (e.action === 'create') {
							const current = matches.current || [];
							if (!current.find((m) => m.id === e.record.id)) {
								matches.mutate([...current, match]);
							}
						} else if (e.action === 'update') {
							matches.mutate(
								(matches.current || []).map((entry) =>
									entry.id === e.record.id ? match : entry
								)
							);
						} else if (e.action === 'delete') {
							matches.mutate((matches.current || []).filter((entry) => entry.id !== e.record.id));
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
				unsubscribe = next;
			})();
		}
	);

	onDestroy(() => {
		subscribeGeneration += 1;
		unsubscribe?.();
	});
</script>

<div
	class={cn(
		'border-secondary-900 overflow-clip border-b',
		'hover:border-secondary-700 transition-colors'
	)}
>
	<div class="border-secondary-800 flex items-center justify-between border-b px-4 py-3">
		<H level="6" class="mb-0 font-semibold">Matches played today</H>
		<div class="flex items-center gap-4">
			{#if !matches.loading}
				<span class="text-secondary-400 text-sm tabular-nums">{matchCount} played</span>
			{/if}
			<Button href="/history" variant="link" size="sm" class="px-0">View all</Button>
		</div>
	</div>

	{#if matches.loading}
		<TodayMatchesTable matches={[]} loading />
	{:else if !matches.current || matches.current.length === 0}
		<p class="text-secondary-400 px-4 py-3 text-sm">You have not played any matches today.</p>
	{:else}
		<TodayMatchesTable matches={matches.current} />
	{/if}
</div>
