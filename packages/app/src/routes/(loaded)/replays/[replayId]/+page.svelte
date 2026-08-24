<script lang="ts">
	import * as Replay from '$lib/components/replay';
	import { page } from '$app/state';
	import { app } from '$core/app/context';
	import { resource } from 'runed';

	let query = resource(
		() => page.params.replayId!,
		() => app.database.replays.getById(page.params.replayId!)
	);
</script>

{#if query.loading}
	<Replay.PageSkeleton />
{:else if query.current}
	<Replay.Root file={query.current} class="border-secondary-900 overflow-clip border-b">
		<Replay.Title />
		<Replay.Details />
		<Replay.Tabs flush />
	</Replay.Root>
{:else if query.error}
	<p class="text-secondary-400 px-4 py-3 text-sm">Failed to load replay.</p>
{/if}
