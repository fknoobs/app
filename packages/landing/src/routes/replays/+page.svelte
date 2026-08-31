<script lang="ts">
	import { goto } from '$app/navigation';
	import { navigating } from '$app/state';
	import Pagination from '$lib/components/Pagination.svelte';
	import ReplayFilters from '$lib/components/ReplayFilters.svelte';
	import ReplayList from '$lib/components/ReplayList.svelte';
	import ReplayListSkeleton from '$lib/components/ReplayListSkeleton.svelte';
	import {
		REPLAYS_PER_PAGE,
		replaysHref,
		type HistoryMapOption,
		type HistorySortField,
		type ReplaysQuery
	} from '$lib/replays';
	import { SITE_URL } from '$lib/urls';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const query = $derived(data.query);
	const switching = $derived(navigating.to?.url.pathname === '/replays');

	function apply(patch: Partial<ReplaysQuery>) {
		const next: ReplaysQuery = {
			...query,
			...patch,
			page: patch.page ?? 1
		};
		void goto(replaysHref(next), {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
	}

	function toggleSort(field: HistorySortField) {
		if (query.sort === field) {
			apply({ sort: field, sortDir: query.sortDir === 'desc' ? 'asc' : 'desc' });
			return;
		}
		apply({ sort: field, sortDir: 'desc' });
	}
</script>

<svelte:head>
	<title>Replays | Company of Heroes - Companion</title>
	<meta
		name="description"
		content="Browse community Company of Heroes replays. Filter by ranked, mode, map, and player, then open overview, chat, and timeline."
	/>
	<meta property="og:url" content="{SITE_URL}/replays" />
	<meta property="og:title" content="CoH community replays" />
</svelte:head>

<div class="border-secondary-800 border-b">
	<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5">
		<h1 class="font-heading text-xl font-bold text-white">Replays</h1>
		{#await data.result}
			<span class="text-secondary-500 text-xs">Loading…</span>
		{:then result}
			<Pagination
				class="ms-auto shrink-0"
				page={query.page}
				count={result.totalItems}
				perPage={REPLAYS_PER_PAGE}
				onPage={(page) => apply({ page })}
			/>
		{:catch}
			<span></span>
		{/await}
	</div>
	<div class="border-secondary-800 flex flex-wrap items-center gap-2 border-t px-4 py-2.5">
		{#await data.maps}
			<ReplayFilters {query} maps={[] as HistoryMapOption[]} onChange={apply} />
		{:then maps}
			<ReplayFilters {query} {maps} onChange={apply} />
		{:catch}
			<ReplayFilters {query} maps={[] as HistoryMapOption[]} onChange={apply} />
		{/await}
	</div>
</div>

{#if switching}
	<ReplayListSkeleton />
{:else}
	{#await data.result}
		<ReplayListSkeleton />
	{:then result}
		<ReplayList
			matches={result.items}
			highlightedPlayers={query.playerIds}
			sort={query.sort}
			sortDir={query.sortDir}
			onSort={toggleSort}
		/>
		<div class="border-secondary-800 flex border-t px-5 py-3">
			<Pagination
				class="ms-auto"
				page={query.page}
				count={result.totalItems}
				perPage={REPLAYS_PER_PAGE}
				onPage={(page) => apply({ page })}
			/>
		</div>
	{:catch error}
		<div class="px-4 py-3">
			<h2 class="font-heading mb-1 text-xl font-bold text-white">Could not load replays</h2>
			<p class="text-secondary-400 text-sm">{error.message}</p>
		</div>
	{/await}
{/if}
