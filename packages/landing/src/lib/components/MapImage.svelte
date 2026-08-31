<script lang="ts">
	import { getMapImageFromName } from '$lib/maps';
	import { cn } from '$lib/cn';

	type Props = {
		map: string | undefined;
		alt?: string;
		class?: string;
		small?: boolean;
		flush?: boolean;
	};

	let {
		map,
		alt: altText,
		class: className,
		small = false,
		flush = false
	}: Props = $props();

	const src = $derived(getMapImageFromName(map));
	const alt = $derived(altText ?? map ?? '');
</script>

{#snippet mapLayers()}
	<img {src} {alt} class="absolute inset-0 z-5 size-full scale-180 object-cover opacity-30" />
	<img {src} {alt} class="relative z-10 size-full object-contain" />
{/snippet}

{#if src}
	{#if small && flush}
		<div class={cn('relative size-11 shrink-0 overflow-clip', className)}>
			{@render mapLayers()}
		</div>
	{:else if flush}
		<div
			class={cn(
				'relative flex h-full min-h-[220px] w-full items-center justify-center overflow-clip',
				className
			)}
		>
			{@render mapLayers()}
		</div>
	{:else}
		<div class={cn('w-10 shrink-0', className)}>
			<div class="relative aspect-square overflow-clip rounded">
				{@render mapLayers()}
			</div>
		</div>
	{/if}
{/if}
