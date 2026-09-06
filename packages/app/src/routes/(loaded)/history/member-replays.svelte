<script lang="ts">
	import { watch } from 'runed';
	import { goto } from '$app/navigation';
	import { Pagination } from '$lib/components/ui/pagination';
	import { Button } from '$lib/components/ui/button';
	import { List as ReplayList } from '@company-of-heroes/ui/replay';
	import { api, unwrapApi } from '$core/api';
	import type { CommunityMatch, HistorySortField, ReplaysQuery } from '@company-of-heroes/api';
	import { getDefaultMapImage, getMapImageFromName, getString } from '$lib/utils/game';
	import { getFactionFlagFromRace } from '$lib/utils';
	import { useI18n } from '$lib/i18n';
	import { app } from '$core/app/context';
	import MemberReplayUploadModal from './member-replay-upload-modal.svelte';

	const { t } = useI18n();
	const PER_PAGE = 30;

	let items = $state<CommunityMatch[]>([]);
	let page = $state(1);
	let totalItems = $state(0);
	let sort = $state<HistorySortField>('createdAt');
	let sortDir = $state<'asc' | 'desc'>('desc');
	let loading = $state(true);
	let loadToken = $state(0);

	async function load() {
		const token = ++loadToken;
		loading = true;
		try {
			const query: ReplaysQuery = {
				page,
				ranked: false,
				pro: false,
				matchups: [],
				playerIds: [],
				maps: [],
				races: [],
				positions: [],
				elo: null,
				duration: null,
				sort,
				sortDir
			};
			const result = await unwrapApi(api.replays.getMemberHistory(query, PER_PAGE));
			if (token !== loadToken) {
				return;
			}

			items = result.items;
			totalItems = result.totalItems;
		} catch (error) {
			console.error(error);
			if (token !== loadToken) {
				return;
			}

			items = [];
			totalItems = 0;
		} finally {
			if (token === loadToken) {
				loading = false;
			}
		}
	}

	watch(
		() => [page, sort, sortDir] as const,
		() => {
			void load();
		}
	);

	function onSort(field: HistorySortField) {
		if (sort === field) {
			sortDir = sortDir === 'desc' ? 'asc' : 'desc';
			return;
		}

		sort = field;
		sortDir = 'desc';
	}

	function openUpload() {
		app.modal.create({
			title: t('Upload replay'),
			size: 'lg',
			component: MemberReplayUploadModal,
			props: {
				onCancel: () => app.modal.close(),
				onDone: (id: string) => {
					app.modal.close();
					void load();
					if (id) {
						void goto(`/replays/${id}`);
					}
				}
			}
		});
		app.modal.open();
	}
</script>

<div class="border-secondary-800 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
	<p class="text-secondary-400 text-sm">
		{t('Public replays uploaded by community members.')}
	</p>
	<div class="flex items-center gap-2">
		<Button type="button" size="sm" onclick={openUpload}>{t('Upload replay')}</Button>
		{#if totalItems > 0}
			<Pagination bind:page perPage={PER_PAGE} count={totalItems} />
		{/if}
	</div>
</div>

{#if loading && items.length === 0}
	<p class="text-secondary-400 px-4 py-3 text-sm">{t('Loading…')}</p>
{:else}
	<ReplayList
		matches={items}
		{sort}
		{sortDir}
		{onSort}
		replayHref={(id) => `/replays/${id}`}
		playerHref={() => null}
		resolveMapSrc={getMapImageFromName}
		resolveFallbackSrc={getDefaultMapImage}
		resolveFactionFlag={getFactionFlagFromRace}
		formatMapName={(map) => getString(map) || map}
		emptyMessage={t('No member replays found.')}
		mapLabel={t('Title')}
		alliesLabel={t('Allies')}
		axisLabel={t('Axis')}
		durationLabel={t('Duration')}
		likesLabel={t('Likes')}
		commentsLabel={t('Comments')}
		downloadsLabel={t('Downloads')}
		dateLabel={t('Date')}
		sortByLabel={t('Sort by {label}')}
		deletedLabel={t('Deleted')}
	/>
{/if}
