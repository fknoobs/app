<script lang="ts">
	import { app } from '$core/app/context';
	import type { MatchExpanded } from '$core/app/database/matches';
	import type { PerformanceScope } from '$core/pocketbase/player-performance';
	import { Button } from '$lib/components/ui/button';
	import { MatchListTable } from '$lib/components/match';
	import { normalizeMapName } from '$lib/utils';
	import { watch } from 'runed';

	type Props = {
		mapKey: string;
		profileId: number;
		scope: PerformanceScope;
		userId?: string | null;
		totalGames?: number;
	};

	const PER_PAGE = 25;

	let { mapKey, profileId, scope, userId = null, totalGames = 0 }: Props = $props();

	const highlightedPlayers = $derived([String(profileId)]);

	let page = $state(1);
	let allMatches = $state<MatchExpanded[]>([]);
	let totalItems = $state(0);
	let initialLoading = $state(true);
	let loadingMore = $state(false);

	async function fetchMatches(pageNum: number) {
		if (!mapKey || !profileId) {
			return { items: [], totalItems: 0 };
		}
		if (scope === 'user' && !userId) {
			return { items: [], totalItems: 0 };
		}

		const playerIds = scope === 'community' ? [String(profileId)] : [];

		return app.database.matches.getHistoryList(pageNum, PER_PAGE, {
			scope,
			userId: userId ?? undefined,
			profileId,
			maps: [mapKey],
			playerIds
		});
	}

	watch(
		() => [mapKey, profileId, scope, userId ?? null] as const,
		async ([nextMapKey, nextProfileId, nextScope, nextUserId]) => {
			page = 1;
			allMatches = [];
			totalItems = 0;
			initialLoading = true;

			if (!nextMapKey || !nextProfileId || (nextScope === 'user' && !nextUserId)) {
				initialLoading = false;
				return;
			}

			try {
				const result = await fetchMatches(1);
				allMatches = result.items;
				totalItems = result.totalItems;
			} catch (error) {
				console.warn('[player-performance] map matches failed:', error);
			} finally {
				initialLoading = false;
			}
		}
	);

	async function loadMore() {
		if (loadingMore || !hasMore) return;

		loadingMore = true;
		try {
			const nextPage = page + 1;
			const result = await fetchMatches(nextPage);
			const existingIds = new Set(allMatches.map((match) => match.id));
			const newItems = result.items.filter((match) => !existingIds.has(match.id));
			allMatches = [...allMatches, ...newItems];
			totalItems = result.totalItems;
			page = nextPage;
		} catch (error) {
			console.warn('[player-performance] load more failed:', error);
		} finally {
			loadingMore = false;
		}
	}

	const totalCount = $derived(Math.max(totalItems, totalGames));
	const hasMore = $derived(allMatches.length > 0 && allMatches.length < totalCount);
</script>

{#snippet loadMoreFooter()}
	{#if hasMore}
		<div class="flex flex-col items-center gap-2 px-4 pt-2 pb-3">
			<p class="text-secondary-500 text-xs">
				Showing {allMatches.length} of {totalCount} matches on {normalizeMapName(mapKey)}
			</p>
			<Button variant="secondary" size="sm" loading={loadingMore} onclick={() => loadMore()}>
				Load more
			</Button>
		</div>
	{/if}
{/snippet}

<MatchListTable
	matches={allMatches}
	loading={initialLoading}
	showMap={false}
	showRating={scope === 'user'}
	{highlightedPlayers}
	emptyMessage="No matches found for this map."
	class="bg-secondary-900/40"
	footer={loadMoreFooter}
/>
