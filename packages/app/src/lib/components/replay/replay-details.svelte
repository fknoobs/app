<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import * as List from '$lib/components/ui/list';
	import { useReplay } from '.';
	import { cn } from '$lib/utils';
	import { getString } from '$lib/utils/game';
	import MapImage from '$lib/components/ui/map-image.svelte';
	import dayjs from '$lib/dayjs';
	import Ranking from 'phosphor-svelte/lib/RankingIcon';
	import { detailMetaGrid } from '$lib/components/ui/variants';

	type Props = {} & HTMLAttributes<HTMLDivElement>;

	let { ...restProps }: Props = $props();
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
		</div>
	</div>
</div>
