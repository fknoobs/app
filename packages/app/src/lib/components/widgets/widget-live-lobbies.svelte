<script lang="ts">
	import LiveLobbiesTable from './live-lobbies-table.svelte';
	import WidgetPanel from './widget-panel.svelte';
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

<WidgetPanel
	title={t('Live lobbies')}
	summary={feed.isLoading ? undefined : t('{count} active', { count: feed.totalItems })}
>
	{#if feed.isLoading}
		<LiveLobbiesTable lobbies={[]} loading />
	{:else if feed.items.length === 0}
		<p class="text-secondary-400 px-4 py-3 text-sm">
			{t('No community members are in a match right now.')}
		</p>
	{:else}
		<LiveLobbiesTable lobbies={feed.items} />
	{/if}
</WidgetPanel>
