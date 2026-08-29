<script lang="ts">
	import type { PlayerEloMap, PlayerPageData } from '$lib/player';
	import {
		getEloColor,
		getEloTextShadow,
		getModeLabel,
		getRaceLabel,
		getRatioColor,
		isEliteElo,
		normalizeMapName,
		winrate
	} from '$lib/player-format';
	import { getFactionFlagByRace } from '$lib/ranks';
	import { cn } from '$lib/cn';
	import { statLosses, statWins } from '$lib/variants';
	import MapImage from '$lib/components/MapImage.svelte';
	import PlayerPerformanceSection from '$lib/components/PlayerPerformanceSection.svelte';
	import ChartLineIcon from 'phosphor-svelte/lib/ChartLineIcon';
	import MapTrifoldIcon from 'phosphor-svelte/lib/MapTrifoldIcon';
	import FlagIcon from 'phosphor-svelte/lib/FlagIcon';
	import UsersThreeIcon from 'phosphor-svelte/lib/UsersThreeIcon';

	type Props = {
		player: PlayerPageData;
	};

	type EloRow = {
		matchtypeId: number;
		raceId: number;
		rating: number;
	};

	let { player }: Props = $props();

	const stats = $derived(player.performance);
	const byMode = $derived(stats.byMode.filter((mode) => mode.matchtypeId !== 14));
	const headerRow = 'text-secondary-400 text-xs font-semibold tracking-wide uppercase';

	let eloExpanded = $state(false);
	let mapsExpanded = $state(false);
	let factionExpanded = $state(false);
	let modeExpanded = $state(false);

	const mapGames = $derived(stats.byMap.reduce((total, row) => total + row.wins + row.losses, 0));
	const factionGames = $derived(
		stats.byFaction.reduce((total, row) => total + row.wins + row.losses, 0)
	);
	const modeGames = $derived(byMode.reduce((total, row) => total + row.wins + row.losses, 0));

	const eloRows = $derived(flattenElo(player.elo));

	function flattenElo(elo: PlayerEloMap | undefined): EloRow[] {
		const rows: EloRow[] = [];
		for (const [matchType, races] of Object.entries(elo ?? {})) {
			const matchtypeId = Number(matchType);
			if (!Number.isInteger(matchtypeId) || matchtypeId === 14) continue;
			for (const [race, slot] of Object.entries(races ?? {})) {
				if (typeof slot?.rating !== 'number' || slot.rating < 1) continue;
				rows.push({ matchtypeId, raceId: Number(race), rating: slot.rating });
			}
		}
		return rows.sort((a, b) => a.matchtypeId - b.matchtypeId || a.raceId - b.raceId);
	}

	function mapCount(mapName: string): string | null {
		return mapName.match(/^(\d+)[pP][ _]/)?.[1] ?? null;
	}
</script>

{#snippet statCells(row: { wins: number; losses: number })}
	<td class="text-secondary-300 w-[3.25rem] px-2 py-1.5 text-center font-medium tabular-nums">
		{row.wins + row.losses}
	</td>
	<td class="{statWins} w-[4.5rem] px-2 py-1.5 text-center font-medium">{row.wins}</td>
	<td class="{statLosses} w-[4.75rem] px-2 py-1.5 text-center font-medium">{row.losses}</td>
	<td
		class="w-[4.5rem] px-2 py-1.5 text-center font-medium tabular-nums"
		style:color={getRatioColor(row.wins, row.losses)}
	>
		{winrate(row.wins, row.losses)}
	</td>
{/snippet}

<PlayerPerformanceSection
	title="ELO history"
	summary="Tracked lobby ratings"
	icon={ChartLineIcon}
	bind:expanded={eloExpanded}
>
	{#if eloRows.length === 0}
		<p class="text-secondary-400 px-4 py-6 text-sm">
			No tracked match ratings yet. Play with the companion running so lobby results can build this
			history.
		</p>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class={headerRow}>
						<th class="px-4 py-2 text-left">Mode</th>
						<th class="px-4 py-2 text-left">Faction</th>
						<th class="w-[6.5rem] px-2 py-2 text-center">ELO</th>
					</tr>
				</thead>
				<tbody>
					{#each eloRows as row (`${row.matchtypeId}-${row.raceId}`)}
						<tr class="border-secondary-800/70 border-t">
							<td class="px-4 py-1.5 text-white">{getModeLabel(row.matchtypeId)}</td>
							<td class="px-4 py-1.5">
								<div class="flex min-w-0 items-center gap-2">
									<img
										src={getFactionFlagByRace(row.raceId)}
										alt=""
										class="w-6 shrink-0 ring-2 ring-black"
									/>
									<span class="min-w-0 truncate">{getRaceLabel(row.raceId)}</span>
								</div>
							</td>
							<td
								class={cn(
									'px-2 py-1.5 text-center tabular-nums',
									isEliteElo(row.rating) && 'font-bold tracking-wide'
								)}
								style:color={getEloColor(row.rating)}
								style:text-shadow={getEloTextShadow(row.rating)}
							>
								{row.rating}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</PlayerPerformanceSection>

{#if stats.matchCount === 0}
	<p class="text-secondary-400 px-4 py-3 text-sm">No tracked community matches for this player.</p>
{:else}
	<PlayerPerformanceSection
		title="By map"
		summary="{stats.byMap.length} maps · {mapGames} games"
		icon={MapTrifoldIcon}
		bind:expanded={mapsExpanded}
	>
		<div class="overflow-x-auto">
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class={headerRow}>
						<th class="px-4 py-2 text-left">Map</th>
						<th class="w-[3.25rem] px-2 py-2 text-center">Games</th>
						<th class="w-[4.5rem] px-2 py-2 text-center">Wins</th>
						<th class="w-[4.75rem] px-2 py-2 text-center">Losses</th>
						<th class="w-[4.5rem] px-2 py-2 text-center">Winrate</th>
					</tr>
				</thead>
				<tbody>
					{#each stats.byMap as row (row.map)}
						{@const players = mapCount(row.map)}
						<tr class="border-secondary-800/70 border-t">
							<td class="px-4 py-1.5">
								<div class="flex min-w-0 items-center gap-3">
									<MapImage map={row.map} alt={normalizeMapName(row.map)} />
									<span class="min-w-0 truncate text-white">
										{normalizeMapName(row.map, false)}
										{#if players}
											<span class="text-secondary-400">({players})</span>
										{/if}
									</span>
								</div>
							</td>
							{@render statCells(row)}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</PlayerPerformanceSection>

	<PlayerPerformanceSection
		title="By faction"
		summary="{stats.byFaction.length} factions · {factionGames} games"
		icon={FlagIcon}
		bind:expanded={factionExpanded}
	>
		<div class="overflow-x-auto">
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class={headerRow}>
						<th class="px-4 py-2 text-left">Faction</th>
						<th class="w-[3.25rem] px-2 py-2 text-center">Games</th>
						<th class="w-[4.5rem] px-2 py-2 text-center">Wins</th>
						<th class="w-[4.75rem] px-2 py-2 text-center">Losses</th>
						<th class="w-[4.5rem] px-2 py-2 text-center">Winrate</th>
					</tr>
				</thead>
				<tbody>
					{#each stats.byFaction as row (row.raceId)}
						<tr class="border-secondary-800/70 border-t">
							<td class="px-4 py-1.5">
								<div class="flex min-w-0 items-center gap-2">
									<img
										src={getFactionFlagByRace(row.raceId)}
										alt=""
										class="w-6 shrink-0 ring-2 ring-black"
									/>
									<span class="min-w-0 truncate text-white">{getRaceLabel(row.raceId)}</span>
								</div>
							</td>
							{@render statCells(row)}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</PlayerPerformanceSection>

	<PlayerPerformanceSection
		title="By mode"
		summary="{byMode.length} game modes · {modeGames} games"
		icon={UsersThreeIcon}
		bind:expanded={modeExpanded}
	>
		<div class="overflow-x-auto">
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class={headerRow}>
						<th class="px-4 py-2 text-left">Mode</th>
						<th class="w-[3.25rem] px-2 py-2 text-center">Games</th>
						<th class="w-[4.5rem] px-2 py-2 text-center">Wins</th>
						<th class="w-[4.75rem] px-2 py-2 text-center">Losses</th>
						<th class="w-[4.5rem] px-2 py-2 text-center">Winrate</th>
					</tr>
				</thead>
				<tbody>
					{#each byMode as row (row.matchtypeId)}
						<tr class="border-secondary-800/70 border-t">
							<td class="px-4 py-1.5 text-white">{getModeLabel(row.matchtypeId)}</td>
							{@render statCells(row)}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</PlayerPerformanceSection>
{/if}
