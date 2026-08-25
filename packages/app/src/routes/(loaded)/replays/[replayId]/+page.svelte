<script lang="ts">
	import * as Replay from '$lib/components/replay';
	import { page } from '$app/state';
	import { app } from '$core/app/context';
	import { account } from '$core/account';
	import { resource } from 'runed';
	import type { ReplayDetail } from '$core/app/database/replays';

	let query = resource(
		() => page.params.replayId!,
		() => app.database.replays.getDetail(page.params.replayId!)
	);

	const canRename = $derived(
		!!query.current?.record && query.current.record.createdBy === account.userId
	);

	function onRenamed(payload: { bytes: Uint8Array; title: string }) {
		const current = query.current;
		if (!current) return;

		const next: ReplayDetail = {
			bytes: payload.bytes,
			record: current.record
				? { ...current.record, title: payload.title, file: current.record.file }
				: null
		};
		query.mutate(next);
	}
</script>

{#if query.loading}
	<Replay.PageSkeleton />
{:else if query.current}
	{#key query.current.bytes}
		<Replay.Root file={query.current.bytes} class="border-secondary-900 overflow-clip border-b">
			<Replay.Title />
			<Replay.Details
				{canRename}
				replayId={query.current.record?.id ?? null}
				{onRenamed}
			/>
			<Replay.Tabs flush />
		</Replay.Root>
	{/key}
{:else if query.error}
	<p class="text-secondary-400 px-4 py-3 text-sm">Failed to load replay.</p>
{/if}
