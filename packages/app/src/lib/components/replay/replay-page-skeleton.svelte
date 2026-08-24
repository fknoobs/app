<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import ReplayTabsSkeleton from './replay-tabs-skeleton.svelte';
	import { cn } from '$lib/utils';
	import { detailMetaGrid } from '$lib/components/ui/variants';

	type Props = {} & HTMLAttributes<HTMLDivElement>;

	let { class: className, ...restProps }: Props = $props();
</script>

<div {...restProps} class={cn('border-secondary-900 overflow-clip border-b', className)}>
	<div class="border-secondary-800 grid grid-cols-1 gap-4 border-b p-4 sm:grid-cols-[minmax(200px,280px)_minmax(0,1fr)] sm:gap-6">
		<Skeleton class="border-secondary-800 aspect-square rounded-lg border" />
		<div class="min-w-0 py-1">
			<Skeleton class="mb-3 h-9 w-2/3" />
			<div class={detailMetaGrid}>
				{#each Array(7) as _, index (index)}
					<Skeleton class="h-4 w-20" />
					<Skeleton class="h-4 w-36" />
				{/each}
			</div>
		</div>
	</div>

	<ReplayTabsSkeleton flush showTitle={false} />
</div>
