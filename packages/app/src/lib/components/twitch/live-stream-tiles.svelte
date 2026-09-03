<script lang="ts">
	import { LiveStreamTiles as Tiles } from '@company-of-heroes/ui/twitch';
	import type { LiveStream } from '$features/twitch/live-streams.svelte';
	import { useI18n } from '$lib/i18n';

	type Props = {
		items: LiveStream[];
		loading?: boolean;
		compact?: boolean;
	};

	let { items, loading = false, compact = false }: Props = $props();
	const { t } = useI18n();

	function streamHref(userName: string) {
		return `https://www.twitch.tv/${userName}`;
	}
</script>

<Tiles
	{items}
	{loading}
	{compact}
	{streamHref}
	emptyMessage={t('No one is streaming Company of Heroes right now.')}
	liveLabel={t('Live')}
/>
