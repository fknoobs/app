<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { getFile } from '$core/pocketbase';
	import type { CaptureRecord } from '$core/pocketbase/anti-cheat';
	import { watch } from 'runed';
	import { cn } from '$lib/utils';
	import { useI18n } from '$lib/i18n';

	type Props = {
		capture: CaptureRecord;
		alt?: string;
		class?: string;
	};

	let { capture, alt, class: className }: Props = $props();
	const { t } = useI18n();

	let src = $state('');
	let failed = $state(false);
	let loading = $state(true);

	watch(
		() => `${capture.id}:${capture.image}`,
		() => {
			const record = capture;
			let cancelled = false;
			let objectUrl = '';
			loading = true;
			failed = false;
			src = '';

			void (async () => {
				try {
					if (!record.image) {
						if (!cancelled) failed = true;
						return;
					}
					const bytes = await getFile(record, record.image);
					if (cancelled) return;
					const url = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
					if (cancelled) {
						URL.revokeObjectURL(url);
						return;
					}
					objectUrl = url;
					src = url;
				} catch (error) {
					console.warn('[ANTI-CHEAT]: screenshot load failed', record.id, error);
					if (!cancelled) failed = true;
				} finally {
					if (!cancelled) loading = false;
				}
			})();

			return () => {
				cancelled = true;
				if (objectUrl) URL.revokeObjectURL(objectUrl);
			};
		}
	);
</script>

{#if loading}
	<Skeleton class={className} />
{:else if src}
	<img {src} alt={alt ?? t('Match screenshot')} class={className} />
{:else if failed}
	<p
		class={cn(
			'text-secondary-500 flex items-center justify-center p-2 text-center text-sm',
			className
		)}
	>
		{t('Could not load screenshot.')}
	</p>
{/if}
