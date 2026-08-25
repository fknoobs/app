<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { page } from '$app/state';
	import * as List from '$lib/components/ui/list';
	import { useReplay } from '.';
	import { cn } from '$lib/utils';
	import { getString } from '$lib/utils/game';
	import MapImage from '$lib/components/ui/map-image.svelte';
	import dayjs from '$lib/dayjs';
	import Ranking from 'phosphor-svelte/lib/RankingIcon';
	import PencilSimpleIcon from 'phosphor-svelte/lib/PencilSimpleIcon';
	import { detailMetaGrid, interactive } from '$lib/components/ui/variants';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { app } from '$core/app/context';

	type Props = {
		canRename?: boolean;
		replayId?: string | null;
		onRenamed?: (payload: { bytes: Uint8Array; title: string }) => void;
	} & HTMLAttributes<HTMLDivElement>;

	let { canRename = false, replayId = null, onRenamed, ...restProps }: Props = $props();
	let replay = $derived(useReplay());
	let isRanked = $derived(replay.matchType === 'automatch');
	const mapKey = $derived(replay.mapFileName.split(/[/\\]/).pop());
	const mapLabel = $derived(getString(replay.mapName));
	const gameDate = $derived(
		replay.gameDate ? dayjs(replay.gameDate).format('DD MMM YYYY, HH:mm') : '—'
	);
	const duration = $derived(
		dayjs
			.duration(replay.duration, 'seconds')
			.format(replay.duration < 3600 ? 'm [min]' : 'H [hr] m [min]')
	);

	let editing = $state(false);
	let draftName = $state('');
	let saving = $state(false);

	function startEdit() {
		draftName = replay.replayName || '';
		editing = true;
	}

	function cancelEdit() {
		editing = false;
		draftName = '';
	}

	async function saveName() {
		if (!replayId || saving) return;
		const next = draftName.trim();
		if (next === (replay.replayName || '').trim()) {
			cancelEdit();
			return;
		}

		saving = true;
		try {
			const result = await app.database.replays.rename(replayId, next);
			onRenamed?.(result);
			app.toast.success('Replay name updated.');
			editing = false;
		} catch (error) {
			app.toast.error('Failed to rename replay: ' + (error as Error).message);
		} finally {
			saving = false;
		}
	}
</script>

<div
	{...restProps}
	class={cn(
		'border-secondary-800 grid grid-cols-1 gap-4 border-b p-4 sm:grid-cols-[minmax(200px,280px)_minmax(0,1fr)] sm:gap-6',
		restProps.class
	)}
>
	<MapImage map={mapKey} alt={mapLabel} />

	<div class="min-w-0 py-1">
		<span class="font-heading mb-3 block truncate text-3xl font-bold">{mapLabel}</span>

		<div class={detailMetaGrid}>
			<List.Title>Replay name</List.Title>
			<List.Value>
				{#if canRename && editing}
					<form
						class="flex min-w-0 flex-wrap items-center gap-2"
						onsubmit={(event) => {
							event.preventDefault();
							void saveName();
						}}
					>
						<Input
							class="min-w-0 flex-1"
							bind:value={draftName}
							disabled={saving}
							placeholder="Replay name"
							aria-label="Replay name"
						/>
						<Button type="submit" size="sm" loading={saving}>Save</Button>
						<Button type="button" size="sm" variant="ghost" disabled={saving} onclick={cancelEdit}>
							Cancel
						</Button>
					</form>
				{:else if canRename}
					<button
						type="button"
						class={cn(interactive, 'group flex max-w-full items-center gap-2 text-left')}
						onclick={startEdit}
					>
						<span class="truncate">{replay.replayName || '—'}</span>
						<PencilSimpleIcon
							class="text-secondary-500 group-hover:text-secondary-300 size-4 shrink-0"
							weight="bold"
						/>
					</button>
				{:else}
					{replay.replayName || '—'}
				{/if}
			</List.Value>

			<List.Title>Date</List.Title>
			<List.Value>{gameDate}</List.Value>
			{#if isRanked}
				<List.Title>Duration</List.Title>
				<List.Value>{duration}</List.Value>
			{:else}
				<List.Title>Lobby title</List.Title>
				<List.Value>{replay.matchType}</List.Value>
			{/if}

			<List.Title>Game mode</List.Title>
			<List.Value class="flex items-center gap-2">
				{#if isRanked}
					<Ranking class="text-primary" /> Ranked
				{:else}
					Custom game
				{/if}
			</List.Value>
			{#if isRanked}
				<List.Title>Players</List.Title>
				<List.Value>{replay.players.length}</List.Value>
			{:else}
				<List.Title>Duration</List.Title>
				<List.Value>{duration}</List.Value>
			{/if}

			{#if replay.vpGame}
				<List.Title>Victory points</List.Title>
				<List.Value>{replay.vpCount}</List.Value>
			{/if}
			{#if !isRanked}
				<List.Title>Players</List.Title>
				<List.Value>{replay.players.length}</List.Value>
			{/if}

			<List.Title>ID</List.Title>
			<List.Value class="tabular-nums">{page.params.replayId}</List.Value>
		</div>
	</div>
</div>
