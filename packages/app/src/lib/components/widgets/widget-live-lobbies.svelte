<script lang="ts">
	import { H } from '$lib/components/ui/h';
	import { cn } from '$lib/utils';
	import LiveLobbiesTable from './live-lobbies-table.svelte';
	import { LiveLobbiesFeed } from './live-lobbies.svelte';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();
	const feed = new LiveLobbiesFeed();

	$effect(() => {
		void feed.start();
		return () => {
			void feed.stop();
		};
	});
</script>

<div
	class={cn(
		'border-secondary-900 overflow-clip border-b',
		'hover:border-secondary-700 transition-colors'
	)}
>
	<div class="border-secondary-800 flex items-center justify-between border-b px-4 py-3">
		<H level="6" class="mb-0 font-semibold">{t('Live lobbies')}</H>
		{#if !feed.isLoading}
			<span class="text-secondary-400 text-sm tabular-nums">{t('{count} active', { count: feed.totalItems })}</span>
		{/if}
	</div>

	{#if feed.isLoading}
		<LiveLobbiesTable lobbies={[]} loading />
	{:else if feed.items.length === 0}
		<p class="text-secondary-400 px-4 py-3 text-sm">
			{t('No community members are in a match right now.')}
		</p>
	{:else}
		<LiveLobbiesTable lobbies={feed.items} />
	{/if}
</div>
