<script lang="ts">
	import { useMatch } from '.';
	import { useI18n } from '$lib/i18n';
	import HeartIcon from 'phosphor-svelte/lib/HeartIcon';
	import DownloadIcon from 'phosphor-svelte/lib/DownloadIcon';

	const match = useMatch();
	const { t } = useI18n();
	const likeCount = $derived(match.likeCount ?? 0);
	const downloadCount = $derived(match.downloadCount ?? 0);
	const showDownload = $derived(!!(match.hasReplay || match.replay));
</script>

<div class="text-secondary-400 flex items-center justify-end gap-3 text-sm tabular-nums">
	<span class="inline-flex items-center gap-1.5" title={t('Likes')}>
		<HeartIcon size={16} weight="duotone" />
		{likeCount}
	</span>
	{#if showDownload}
		<span class="inline-flex items-center gap-1.5" title={t('Downloads')}>
			<DownloadIcon size={16} weight="duotone" />
			{downloadCount}
		</span>
	{/if}
</div>
