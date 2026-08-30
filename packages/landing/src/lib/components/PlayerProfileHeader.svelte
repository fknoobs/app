<script lang="ts">
	import type { PlayerPageData } from '$lib/player';
	import {
		getModeLabel,
		getRaceLabel,
		getRatioColor,
		getRatioValue,
		winrate
	} from '$lib/player-format';
	import { flagImageUrl, proxiedImageUrl } from '$lib/proxy-image';
	import { cn } from '$lib/cn';
	import { interactive, statLosses, statWins } from '$lib/variants';
	import PlayerLabels from '$lib/components/PlayerLabels.svelte';
	import SmurfAlert from '$lib/components/SmurfAlert.svelte';

	type Props = {
		player: PlayerPageData;
	};

	let { player }: Props = $props();

	const stats = $derived(player.performance);
	const bestMap = $derived.by(() => {
		const eligible = stats.byMap.filter((map) => map.wins + map.losses >= 3);
		const pool = eligible.length > 0 ? eligible : stats.byMap;
		return (
			[...pool].sort(
				(a, b) => getRatioValue(b.wins, b.losses) - getRatioValue(a.wins, a.losses)
			)[0] ?? null
		);
	});

	const avatarBorder = $derived(
		player.gameextrainfo?.trim() === 'Company of Heroes'
			? 'border-green-500'
			: player.personastate > 0
				? 'border-blue-400'
				: 'border-secondary-800'
	);
</script>

<div class="border-secondary-800 grid grid-cols-1 border-b sm:grid-cols-[12.5rem_minmax(0,1fr)]">
	<div
		class={cn('bg-secondary-800 relative aspect-square overflow-clip sm:border-r', avatarBorder)}
	>
		<img
			src={proxiedImageUrl(player.avatarUrl)}
			alt={player.alias}
			class="absolute inset-0 size-full object-cover"
		/>
	</div>
	<div class="min-w-0 px-6 py-4">
		<div class="mb-3 flex flex-wrap items-center gap-2.5">
			{#if flagImageUrl(player.country)}
				<img
					class="h-5 w-auto shrink-0 rounded-xs"
					src={flagImageUrl(player.country)!}
					alt={player.country ?? ''}
				/>
			{/if}
			<h1 class="font-heading truncate text-3xl font-bold text-white">{player.alias}</h1>
			<PlayerLabels labels={player.labels} class="shrink-0" />
			{#if player.smurf}
				<SmurfAlert smurf={player.smurf} />
			{/if}
			<span class="text-secondary-500 text-sm">Level {player.level}</span>
		</div>
		<dl class="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 text-sm">
			<dt class="text-secondary-500">Steam ID</dt>
			<dd>
				<a
					href="https://steamcommunity.com/profiles/{player.steamId}"
					target="_blank"
					rel="noopener noreferrer"
					class={cn(interactive, 'text-secondary-200 hover:text-primary tabular-nums')}
				>
					{player.steamId}
				</a>
			</dd>
			{#if stats.matchCount > 0}
				<dt class="text-secondary-500">Tracked</dt>
				<dd class="text-secondary-200">{stats.matchCount} matches</dd>
				<dt class="text-secondary-500">Record</dt>
				<dd class="flex flex-wrap items-center gap-2">
					<span class={cn('font-semibold', statWins)}>{stats.wins}W</span>
					<span class="text-secondary-600">·</span>
					<span class={cn('font-semibold', statLosses)}>{stats.losses}L</span>
					<span class="font-semibold" style:color={getRatioColor(stats.wins, stats.losses)}>
						{winrate(stats.wins, stats.losses)}
					</span>
				</dd>
				{#if stats.recentMatches.length > 0}
					<dt class="text-secondary-500">Recent</dt>
					<dd class="flex flex-wrap gap-1">
						{#each stats.recentMatches as match (match.id || match.sessionId)}
							<span
								class={cn(
									'min-w-6 rounded-md border px-1.5 py-0.5 text-center text-xs font-semibold',
									match.outcome === 1
										? 'border-success/20 bg-success/10 text-green-300'
										: 'border-destructive/20 bg-destructive/10 text-red-300'
								)}
								title="{match.outcome === 1 ? 'Win' : 'Loss'}{match.raceId != null
									? ` · ${getRaceLabel(match.raceId)}`
									: ''}{match.matchtypeId != null ? ` · ${getModeLabel(match.matchtypeId)}` : ''}"
							>
								{match.outcome === 1 ? 'W' : 'L'}
							</span>
						{/each}
					</dd>
				{/if}
				{#if bestMap}
					<dt class="text-secondary-500">Best map</dt>
					<dd class="text-secondary-200 min-w-0 truncate">
						{bestMap.map.replace(/_/g, ' ')}
						<span class={cn('ml-2 font-semibold', statWins)}>{bestMap.wins}W</span>
						<span class="text-secondary-600">·</span>
						<span class={cn('font-semibold', statLosses)}>{bestMap.losses}L</span>
					</dd>
				{/if}
			{:else}
				<dt class="text-secondary-500">Tracked</dt>
				<dd class="text-secondary-400">No community matches recorded yet.</dd>
			{/if}
		</dl>
	</div>
</div>
