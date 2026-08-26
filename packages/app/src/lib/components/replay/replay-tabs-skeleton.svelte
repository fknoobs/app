<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { cn } from '$lib/utils';
	import { useI18n } from '$lib/i18n';

	type Props = {
		flush?: boolean;
		showTitle?: boolean;
	} & HTMLAttributes<HTMLDivElement>;

	let { flush = false, showTitle = true, class: className, ...restProps }: Props = $props();
	const { t } = useI18n();

	const playerRow =
		'grid grid-cols-[3.5rem_minmax(0,1fr)_3.25rem] items-center gap-3 px-4 py-3';
</script>

{#snippet playerRowSkeleton()}
	<div class={cn(playerRow, 'border-secondary-800 border-b last:border-b-0')}>
		<Skeleton class="size-14 shrink-0 rounded-lg" />
		<div class="min-w-0 space-y-2">
			<Skeleton class="h-4 w-3/4" />
			<Skeleton class="h-3 w-1/2" />
		</div>
		<Skeleton class="ml-auto h-8 min-w-11 rounded-md" />
	</div>
{/snippet}

{#snippet teamColumn(label: string)}
	<div class="min-w-0">
		<div
			class={cn(
				playerRow,
				'bg-secondary-950/90 text-secondary-300 border-secondary-800 border-b py-2! text-xs font-semibold tracking-wide uppercase'
			)}
		>
			<span aria-hidden="true"></span>
			<span>{label}</span>
			<span class="text-right">{t('CPM')}</span>
		</div>
		{#each Array(4) as _, index (index)}
			{@render playerRowSkeleton()}
		{/each}
	</div>
{/snippet}

<div
	{...restProps}
	class={cn(flush ? 'border-secondary-800 border-t' : 'mt-8 flex flex-col gap-4', className)}
>
	{#if showTitle}
		<Skeleton class="h-8 w-24" />
	{/if}

	<div class={cn('flex w-fit items-center gap-2', flush ? 'border-secondary-800 border-b px-4 py-2.5' : 'mb-2')}>
		<Skeleton class="h-9 w-24" />
		<Skeleton class="h-9 w-16" />
		<Skeleton class="h-9 w-24" />
	</div>

	<div class={cn('grid grid-cols-1 md:grid-cols-2', flush ? 'divide-secondary-800 md:divide-x' : 'gap-4')}>
		{@render teamColumn(t('Allies'))}
		{@render teamColumn(t('Axis'))}
	</div>
</div>
