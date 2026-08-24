<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Leaderboard } from '$lib/components/leaderboard';
</script>

<div class="border-secondary-900 overflow-clip border-b">
	<div class="border-secondary-800 flex gap-4 border-b p-4">
		<Skeleton class="size-40 shrink-0 rounded-xl sm:size-44" />
		<div class="min-w-0 grow py-1">
			<div class="mb-3 flex items-center gap-2.5">
				<Skeleton class="h-5 w-7 shrink-0 rounded-xs" />
				<Skeleton class="h-9 max-w-52 flex-1" />
			</div>
			<div class="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2">
				<Skeleton class="h-4 w-16" />
				<Skeleton class="h-4 w-24" />
				<Skeleton class="h-4 w-14" />
				<div class="flex items-center gap-2">
					<Skeleton class="h-4 w-8" />
					<Skeleton class="h-4 w-8" />
					<Skeleton class="h-5 w-12 rounded-full" />
				</div>
				<Skeleton class="h-4 w-28" />
				<div class="flex gap-1 overflow-hidden">
					{#each Array(10) as _, index (index)}
						<Skeleton class="size-6 shrink-0 rounded-full" />
					{/each}
				</div>
				<Skeleton class="h-4 w-20" />
				<div class="flex flex-wrap items-center gap-2">
					<Skeleton class="h-4 w-32" />
					<Skeleton class="h-4 w-8" />
					<Skeleton class="h-4 w-8" />
					<Skeleton class="h-4 w-10" />
				</div>
			</div>
		</div>
	</div>

	<div class="border-secondary-800 border-b">
		<div class="flex items-center gap-2 px-4 py-2.5">
			<Skeleton class="h-8 w-14 rounded-md" />
			<Skeleton class="h-8 w-24 rounded-md" />
			<Skeleton class="h-8 w-28 rounded-md" />
		</div>

		<div class="border-secondary-800 border-t">
			<Leaderboard stats={[]} loading skeletonRows={12} class="rounded-none border-0" />
		</div>
	</div>

	<div class="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3">
		<Skeleton class="h-4 w-36" />
		<Skeleton class="h-4 w-28" />
		<Skeleton class="h-4 w-32" />
	</div>
</div>
