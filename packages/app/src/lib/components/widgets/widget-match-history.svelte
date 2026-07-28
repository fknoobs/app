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
	import { todayPlayedMatchesFilter } from './dashboard-utils';

	let unsubscribe = $state<UnsubscribeFunc>();
	let matches = resource(
		() =>
			[
				app.game.profile?.relic.profile_id ?? null,
				app.features.auth.userId ?? null
			] as const,
		([profileId, userId]) => {
			if (!profileId && !userId) return Promise.resolve([]);
			return app.database.matches.getList({
				filter: todayPlayedMatchesFilter(profileId, userId),
				sort: '-createdAt'
			});
		}
	);

	const matchCount = $derived(matches.current?.length ?? 0);

	watch(
		() =>
			[
				app.game.profile?.relic.profile_id ?? null,
				app.features.auth.userId ?? null
			] as const,
		async ([profileId, userId]) => {
			await unsubscribe?.();
			unsubscribe = undefined;
			if (!profileId && !userId) return;

			unsubscribe = await app.pocketbase.collection('lobbies').subscribe<LobbyMatch>(
				'*',
				(e) => {
					if (e.action === 'create') {
						const current = matches.current || [];
						if (!current.find((m) => m.id === e.record.id)) {
							matches.mutate([...current, exp(e.record) as MatchExpanded]);
						}
					} else if (e.action === 'update') {
						matches.mutate(
							(matches.current || []).map((match) =>
								match.id === e.record.id ? (exp(e.record) as MatchExpanded) : match
							)
						);
					} else if (e.action === 'delete') {
						matches.mutate((matches.current || []).filter((match) => match.id !== e.record.id));
					}
				},
				{
					filter: todayPlayedMatchesFilter(profileId, userId),
					sort: '-createdAt',
					fetch
				}
			);
		}
	);

	onDestroy(() => {
		unsubscribe?.();
	});
</script>

<div
	class={cn(
		'bg-secondary-950/40 border-secondary-900 overflow-clip rounded-lg border',
		'hover:border-secondary-700 transition-colors'
	)}
>
	<div class="border-secondary-800 flex items-center justify-between border-b px-5 py-3">
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
		<p class="text-secondary-400 px-5 py-3 text-sm">You have not played any matches today.</p>
	{:else}
		<TodayMatchesTable matches={matches.current} />
	{/if}
</div>
