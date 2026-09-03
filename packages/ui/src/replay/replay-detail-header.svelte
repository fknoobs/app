<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button } from '@company-of-heroes/ui/button';
	import MapImage from '@company-of-heroes/ui/map-image';
	import { cn } from '@company-of-heroes/ui/cn';
	import { interactive } from '@company-of-heroes/ui/variants';
	import ArrowLeftIcon from 'phosphor-svelte/lib/ArrowLeftIcon';
	import DownloadIcon from 'phosphor-svelte/lib/DownloadIcon';

	type Props = {
		mapName: string;
		map: string;
		downloadHref: string;
		downloadFileName: string;
		downloadCount: number;
		listHref: string;
		resolveMapSrc: (map: string | undefined) => string | undefined;
		onDownloadClick?: () => void;
		replaysLabel?: string;
		downloadLabel?: string;
		backAriaLabel?: string;
		downloadsLabel?: string;
		vote?: Snippet;
		titleMeta?: Snippet;
		details: Snippet;
		actions?: Snippet;
	};

	let {
		mapName,
		map,
		downloadHref,
		downloadFileName,
		downloadCount,
		listHref,
		resolveMapSrc,
		onDownloadClick,
		replaysLabel = 'Replays',
		downloadLabel = 'Download replay',
		backAriaLabel = 'Back to replays',
		downloadsLabel = 'Downloads',
		vote,
		titleMeta,
		details,
		actions
	}: Props = $props();
</script>

<div class="border-secondary-800 border-b">
	<div class="border-secondary-800 flex items-center gap-3 border-b px-4 py-3">
		<a
			href={listHref}
			aria-label={backAriaLabel}
			class={cn(
				interactive,
				'border-secondary-800 bg-secondary-800/30 hover:border-secondary-500 hover:bg-secondary-800/80 inline-flex size-9 shrink-0 items-center justify-center rounded-md border text-white'
			)}
		>
			<ArrowLeftIcon class="size-4" weight="duotone" />
		</a>
		<nav aria-label="Breadcrumb" class="font-heading min-w-0 text-sm font-bold">
			<ol class="flex items-center">
				<li>
					<a href={listHref} class={cn(interactive, 'text-secondary-400 hover:text-primary')}>
						{replaysLabel}
					</a>
				</li>
				<li aria-hidden="true" class="text-secondary-500 mx-2">/</li>
				<li class="min-w-0 truncate text-white">{mapName}</li>
			</ol>
		</nav>
	</div>
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(220px,280px)_auto_minmax(0,1fr)]">
		<MapImage {map} alt={mapName} flush {resolveMapSrc} />
		{#if vote}
			<div class="flex items-start justify-center px-6 sm:px-0 sm:py-4">
				{@render vote()}
			</div>
		{/if}
		<div class={cn('min-w-0 px-6 py-4', vote && 'sm:pl-0')}>
			<div class="mb-3 flex min-w-0 items-center gap-3">
				<h1 class="font-heading min-w-0 truncate text-3xl font-bold text-white">{mapName}</h1>
				{@render titleMeta?.()}
			</div>
			{@render details()}
			<div class="mt-4 flex flex-wrap items-center gap-3">
				<Button href={downloadHref} download={downloadFileName} onclick={() => onDownloadClick?.()}>
					<DownloadIcon class="size-4" />
					{downloadLabel}
				</Button>
				{@render actions?.()}
				<span
					class="text-secondary-400 inline-flex h-11 items-center gap-1.5 px-3 text-sm tabular-nums"
					title={downloadsLabel}
				>
					<DownloadIcon class="size-4" weight="duotone" />
					{downloadCount}
				</span>
			</div>
		</div>
	</div>
</div>
