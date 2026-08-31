<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { REPLAYS_PER_PAGE } from '$lib/replays';
	import { tableHeadRow } from '$lib/variants';

	const rows = Array.from({ length: REPLAYS_PER_PAGE }, (_, i) => i + 1);
</script>

<div class="overflow-x-auto" aria-busy="true">
	<table class="w-full table-fixed border-collapse text-sm">
		<thead>
			<tr class="{tableHeadRow} text-left">
				<th class="w-8/24 px-4 py-2">Map</th>
				<th class="w-3/24 px-4 py-2">Allies</th>
				<th class="w-3/24 px-4 py-2">Axis</th>
				<th class="w-2/24 px-4 py-2">Duration</th>
				<th class="w-2/24 px-4 py-2 text-right">Likes</th>
				<th class="w-2/24 px-4 py-2 text-right">Downloads</th>
				<th class="w-4/24 px-4 py-2 text-end">Date</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row)}
				<tr class="border-secondary-800/70 h-11 border-t">
					<td class="overflow-clip py-0 pr-0 pl-4">
						<div class="flex h-11 items-center gap-4">
							<Skeleton class="size-11 rounded-none" />
							<Skeleton class="h-4 w-36" />
						</div>
					</td>
					<td class="px-4 py-0">
						<div class="flex gap-1.5">
							<Skeleton class="size-6 rounded-full" />
							<Skeleton class="size-6 rounded-full" />
						</div>
					</td>
					<td class="px-4 py-0">
						<div class="flex gap-1.5">
							<Skeleton class="size-6 rounded-full" />
							<Skeleton class="size-6 rounded-full" />
						</div>
					</td>
					<td class="px-4 py-0"><Skeleton class="h-4 w-14" /></td>
					<td class="px-4 py-0"><Skeleton class="ml-auto h-4 w-8" /></td>
					<td class="px-4 py-0"><Skeleton class="ml-auto h-4 w-8" /></td>
					<td class="px-4 py-0"><Skeleton class="ml-auto h-4 w-16" /></td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
