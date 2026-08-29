<script lang="ts">
	import { getMapImageFromName } from '$lib/maps';
	import { cn } from '$lib/cn';

	type Props = {
		map: string | undefined;
		alt?: string;
		class?: string;
	};

	let { map, alt: altText, class: className }: Props = $props();

	const src = $derived(getMapImageFromName(map));
	const alt = $derived(altText ?? map ?? '');
</script>

{#if src}
	<div class={cn('w-10 shrink-0', className)}>
		<div class="relative aspect-square overflow-clip rounded">
			<img {src} {alt} class="absolute inset-0 z-5 size-full scale-180 object-cover opacity-30" />
			<img {src} {alt} class="relative z-10 size-full object-contain" />
		</div>
	</div>
{/if}
