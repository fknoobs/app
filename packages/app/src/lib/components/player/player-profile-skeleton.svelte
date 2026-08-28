<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Leaderboard } from '$lib/components/leaderboard';
	import { cn } from '$lib/utils';

	type Props = {
		widget?: boolean;
		expanded?: boolean;
		class?: string;
	};

	let { widget = false, expanded = !widget, class: className }: Props = $props();
</script>

<div class={cn('border-secondary-900 overflow-clip border-b', className)}>
	{#if widget}
		<div
			class="border-secondary-800 grid grid-cols-1 border-b sm:grid-cols-[minmax(170px,220px)_minmax(0,1fr)]"
		>
			<Skeleton class="aspect-square h-full min-h-0 rounded-none sm:aspect-auto" />
			<div class="flex min-h-0 min-w-0 flex-col sm:h-full">
				<div class="flex items-center gap-3 px-6 py-3">
					<Skeleton class="h-7 max-w-52 flex-1" />
					<Skeleton class="h-4 w-16 shrink-0" />
				</div>
				<div class="border-secondary-800 flex min-h-0 flex-1 flex-col border-t">
					<div class="grid min-h-0 flex-1 grid-cols-6">
						{#each Array(6) as _, index (index)}
							<div
								class={cn(
									'border-secondary-800 flex h-full flex-col items-center gap-1.5 px-2 py-3',
									index < 5 && 'border-r'
								)}
							>
								<Skeleton class="h-3 w-10" />
								<Skeleton class="h-4 w-12" />
								<Skeleton class={index < 4 ? 'size-8' : 'h-4 w-16'} />
							</div>
						{/each}
					</div>
				</div>
				<div
					class="border-secondary-800 divide-secondary-800 mt-auto grid grid-cols-10 divide-x overflow-clip border-t"
				>
					{#each Array(10) as _, index (index)}
						<Skeleton class="h-8 rounded-none" />
					{/each}
				</div>
			</div>
		</div>
	{:else}
		<div
			class="border-secondary-800 grid grid-cols-1 border-b sm:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]"
		>
			<Skeleton class="aspect-square rounded-none sm:aspect-auto sm:min-h-55" />
			<div class="min-w-0 px-6 py-4">
				<div class="mb-3 flex items-center gap-2.5">
					<Skeleton class="h-5 w-7 shrink-0 rounded-xs" />
					<Skeleton class="h-9 max-w-52 flex-1" />
				</div>
				<div class="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2">
					<Skeleton class="h-4 w-16" />
					<Skeleton class="h-4 w-24" />
					<Skeleton class="h-4 w-14" />
					<div class="flex items-center gap-2">
						<Skeleton class="h-4 w-8" />
						<Skeleton class="h-4 w-8" />
						<Skeleton class="h-5 w-12 rounded-full" />
					</div>
					<Skeleton class="h-4 w-16" />
					<div class="flex gap-1 overflow-hidden">
						{#each Array(10) as _, index (index)}
							<Skeleton class="size-6 shrink-0 rounded-full" />
						{/each}
					</div>
					<Skeleton class="h-4 w-20" />
					<div class="flex items-center gap-2">
						<Skeleton class="size-10 shrink-0 rounded" />
						<Skeleton class="h-4 w-32" />
						<Skeleton class="h-4 w-8" />
						<Skeleton class="h-4 w-8" />
						<Skeleton class="h-4 w-10" />
					</div>
				</div>
			</div>
		</div>
	{/if}

	<div class={cn(!widget && 'border-secondary-800 border-b')}>
		<div class={cn('flex items-center px-4 py-2.5', widget ? 'justify-between' : 'gap-2')}>
			<div class="flex items-center gap-2">
				<Skeleton class="h-8 w-14 rounded-md" />
				<Skeleton class="h-8 w-24 rounded-md" />
				<Skeleton class={cn('h-8 rounded-md', widget ? 'w-32' : 'w-28')} />
			</div>
			{#if widget}
				<Skeleton class="size-4 rounded-sm" />
			{/if}
		</div>
		{#if expanded}
			<div class="border-secondary-800 border-t">
				<Leaderboard stats={[]} loading skeletonRows={12} class="rounded-none border-0" />
			</div>
		{/if}
	</div>

	{#if !widget}
		<div class="bg-secondary-950/50 flex flex-wrap gap-x-4 gap-y-1 px-4 py-3">
			<Skeleton class="h-4 w-36" />
			<Skeleton class="h-4 w-28" />
			<Skeleton class="h-4 w-32" />
		</div>
	{/if}
</div>
