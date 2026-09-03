<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { Skeleton } from '@company-of-heroes/ui/skeleton';
	import { cn } from '@company-of-heroes/ui/cn';

	type Props = {
		flush?: boolean;
		showTitle?: boolean;
		rowCount?: number;
		overviewLabel?: string;
		chatLabel?: string;
		timelineLabel?: string;
		alliesLabel?: string;
		axisLabel?: string;
		ratingLabel?: string;
		cpmLabel?: string;
	} & HTMLAttributes<HTMLDivElement>;

	let {
		flush = false,
		showTitle = true,
		rowCount = 4,
		overviewLabel = 'Overview',
		chatLabel = 'Chat',
		timelineLabel = 'Timeline',
		alliesLabel = 'Allies',
		axisLabel = 'Axis',
		ratingLabel = 'Rating',
		cpmLabel = 'CPM',
		class: className,
		...restProps
	}: Props = $props();

	const rows = $derived(Array.from({ length: rowCount }, (_, i) => i + 1));
</script>

{#snippet playerRowSkeleton()}
	<div class="border-secondary-800 border-b last:border-b-0">
		<div class="flex items-center gap-4 px-4 py-3.5">
			<div class="min-w-0 flex-1">
				<div class="flex min-w-0 items-center gap-2">
					<Skeleton class="h-4 w-5 shrink-0 rounded-xs" />
					<Skeleton class="h-4 w-36" />
				</div>
				<div class="mt-1.5 flex items-center gap-2.5">
					<Skeleton class="size-4 shrink-0 rounded-full" />
					<Skeleton class="h-4 w-28" />
					<Skeleton class="h-4 w-14" />
				</div>
			</div>
			<Skeleton class="h-4 w-10 shrink-0" />
			<div class="flex w-12 shrink-0 flex-col items-center justify-center gap-0.5">
				<Skeleton class="h-3 w-8" />
				<Skeleton class="h-5 w-8" />
			</div>
		</div>
	</div>
{/snippet}

{#snippet teamColumn(label: string)}
	<div class="min-w-0">
		<div
			class="bg-secondary-950/90 text-secondary-300 border-secondary-800 flex items-center gap-4 border-b px-4 py-2.5 text-sm font-semibold tracking-wide uppercase"
		>
			<span class="min-w-0 flex-1">{label}</span>
			<span class="text-right">{ratingLabel}</span>
			<span class="text-primary w-12 text-center font-semibold">{cpmLabel}</span>
		</div>
		{#each rows as row (row)}
			{@render playerRowSkeleton()}
		{/each}
	</div>
{/snippet}

<div {...restProps} class={cn(!flush && 'mt-8 flex flex-col gap-4', className)} aria-busy="true">
	{#if showTitle}
		<Skeleton class="h-8 w-24" />
	{/if}

	<div class="border-secondary-800 flex items-center gap-2 border-b px-4 py-2.5">
		<span
			class="border-primary/20 bg-primary/5 text-primary rounded-md border px-4 py-1.5 font-bold"
		>
			{overviewLabel}
		</span>
		<span class="rounded-md border border-transparent px-4 py-1.5 font-bold text-white">
			{chatLabel}
		</span>
		<span class="rounded-md border border-transparent px-4 py-1.5 font-bold text-white">
			{timelineLabel}
		</span>
	</div>

	<div class={cn('grid grid-cols-1 md:grid-cols-2', flush && 'divide-secondary-800 md:divide-x')}>
		{@render teamColumn(alliesLabel)}
		{@render teamColumn(axisLabel)}
	</div>
</div>
