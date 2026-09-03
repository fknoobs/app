<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import { navigating } from '$app/state';
	import { Pagination } from '@company-of-heroes/ui/pagination';
	import { Skeleton } from '@company-of-heroes/ui/skeleton';
	import { List as ReplayList, ListSkeleton as ReplayListSkeleton } from '@company-of-heroes/ui/replay';
	import ReplayFilters from '$lib/components/replay/replay-filters.svelte';
	import {
		normalizeMapName,
		replayHref,
		resolveFactionFlag,
		resolveMapSrc,
		resolvePlayerHref
	} from '$lib/utils/resolvers';
	import {
		REPLAYS_PER_PAGE,
		rememberReplaysListHref,
		replaysHref,
		type HistorySortField,
		type ReplaysQuery
	} from '$lib/replays';
	import { href, unlocalizedPath, currentLocale, useI18n } from '$lib/i18n';
	import { SITE_URL } from '$lib/site/urls';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { t } = useI18n();

	const query = $derived(data.query);
	const switching = $derived(unlocalizedPath(navigating.to?.url.pathname ?? '') === '/replays');
	const canonical = $derived(`${SITE_URL}${href('/replays')}`);

	beforeNavigate(() => {
		rememberReplaysListHref(replaysHref(query));
	});

	function apply(patch: Partial<ReplaysQuery>) {
		const next: ReplaysQuery = {
			...query,
			...patch,
			page: patch.page ?? 1
		};
		void goto(href(replaysHref(next)), {
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

{#snippet listSkeleton()}
	<ReplayListSkeleton
		mapLabel={t('Map')}
		alliesLabel={t('Allies')}
		axisLabel={t('Axis')}
		durationLabel={t('Duration')}
		likesLabel={t('Likes')}
		commentsLabel={t('Comments')}
		downloadsLabel={t('Downloads')}
		dateLabel={t('Date')}
	/>
{/snippet}

<svelte:head>
	<title>{t('Replays')} | {t('Company of Heroes 1 Stats')}</title>
	<meta
		name="description"
		content={t(
			'Browse community Company of Heroes replays. Filter by ranked, mode, map, and player, then open overview, chat, and timeline.'
		)}
	/>
	<meta property="og:url" content={canonical} />
	<meta property="og:title" content={t('CoH community replays')} />
</svelte:head>

<div class="border-secondary-800 border-b">
	<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5">
		<h1 class="font-heading text-xl font-bold text-white">{t('Replays')}</h1>
		{#await data.result}
			<Skeleton class="ms-auto h-9 w-56 shrink-0" />
		{:then result}
			<Pagination
				class="ms-auto shrink-0"
				page={query.page}
				count={result.totalItems}
				perPage={REPLAYS_PER_PAGE}
				pageNumberLabel={t('Page number')}
				onPage={(nextPage) => apply({ page: nextPage })}
			/>
		{/await}
	</div>
	<div class="border-secondary-800 flex flex-wrap items-center gap-2 border-t px-4 py-2.5">
		{#await data.maps}
			<ReplayFilters {query} maps={[]} onChange={apply} />
		{:then maps}
			<ReplayFilters {query} {maps} onChange={apply} />
		{/await}
	</div>
</div>

{#if switching}
	{@render listSkeleton()}
{:else}
	{#await data.result}
		{@render listSkeleton()}
	{:then result}
		<ReplayList
			matches={result.items}
			highlightedPlayers={query.playerIds}
			sort={query.sort}
			sortDir={query.sortDir}
			onSort={toggleSort}
			{replayHref}
			playerHref={resolvePlayerHref}
			{resolveMapSrc}
			{resolveFactionFlag}
			formatMapName={normalizeMapName}
			emptyMessage={t('No community replays found.')}
			locale={currentLocale()}
			mapLabel={t('Map')}
			alliesLabel={t('Allies')}
			axisLabel={t('Axis')}
			durationLabel={t('Duration')}
			likesLabel={t('Likes')}
			commentsLabel={t('Comments')}
			downloadsLabel={t('Downloads')}
			dateLabel={t('Date')}
			sortByLabel={t('Sort by {label}')}
		/>
		<div class="border-secondary-800 flex border-t px-5 py-3">
			<Pagination
				class="ms-auto"
				page={query.page}
				count={result.totalItems}
				perPage={REPLAYS_PER_PAGE}
				pageNumberLabel={t('Page number')}
				onPage={(nextPage) => apply({ page: nextPage })}
			/>
		</div>
	{/await}
{/if}
