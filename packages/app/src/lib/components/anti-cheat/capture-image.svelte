<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { getFile } from '$core/pocketbase';
	import type { CaptureRecord } from '$core/pocketbase/anti-cheat';
	import { useI18n } from '$lib/i18n';

	type Props = {
		capture: CaptureRecord;
		alt?: string;
		class?: string;
	};

	let { capture, alt, class: className }: Props = $props();
	const { t } = useI18n();

	let loadId = 0;
	let previousUrl = '';

	const loadImage = async (record: CaptureRecord) => {
		const id = ++loadId;
		if (!record.image) return '';
		const bytes = await getFile(record, record.image);
		if (id !== loadId) return '';
		if (previousUrl) URL.revokeObjectURL(previousUrl);
		previousUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
		return previousUrl;
	};
</script>

{#key capture.id}
	{#await loadImage(capture)}
		<Skeleton class={className} />
	{:then src}
		{#if src}
			<img {src} alt={alt ?? t('Match screenshot')} class={className} />
		{:else}
			<p class="text-secondary-500 text-sm">{t('Could not load screenshot.')}</p>
		{/if}
	{:catch}
		<p class="text-destructive text-sm">{t('Could not load screenshot.')}</p>
	{/await}
{/key}
