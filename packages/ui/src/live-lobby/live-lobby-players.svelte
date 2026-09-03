<script lang="ts">
	import { cn } from '@company-of-heroes/ui/cn';
	import { interactive } from '@company-of-heroes/ui/variants';
	import {
		defaultLiveLobbyPlayerLabel,
		playerRowKey,
		teamPlayers,
		type LiveLobbyPlayer
	} from './types';

	type Props = {
		players: LiveLobbyPlayer[];
		resolveFactionFlag: (race: number) => string;
		playerHref: (player: LiveLobbyPlayer) => string | null;
		playerLabel?: (player: LiveLobbyPlayer) => string;
		alliesLabel?: string;
		axisLabel?: string;
	};

	let {
		players,
		resolveFactionFlag,
		playerHref,
		playerLabel = defaultLiveLobbyPlayerLabel,
		alliesLabel = 'Allies',
		axisLabel = 'Axis'
	}: Props = $props();

	const allies = $derived(teamPlayers(players, 'allies'));
	const axis = $derived(teamPlayers(players, 'axis'));
</script>

{#snippet playerRow(player: LiveLobbyPlayer, rowIndex: number)}
	{@const href = playerHref(player)}
	{@const label = playerLabel(player)}
	<div class="border-secondary-800 flex h-11 items-center gap-2.5 border-b px-4 last:border-b-0">
		<img
			src={resolveFactionFlag(player.race)}
			alt=""
			class="ring-secondary-800 size-6 shrink-0 rounded-full object-cover ring-4"
		/>
		{#if href}
			<a {href} class={cn(interactive, 'min-w-0 truncate text-sm font-medium text-white')}>
				{label}
			</a>
		{:else}
			<span class="text-secondary-300 min-w-0 truncate text-sm">{label}</span>
		{/if}
	</div>
{/snippet}

{#snippet teamColumn(label: string, team: LiveLobbyPlayer[])}
	<div class="min-w-0">
		<div
			class="bg-secondary-950/90 text-secondary-300 border-secondary-800 border-b px-4 py-2.5 text-xs font-semibold tracking-wide uppercase"
		>
			{label}
		</div>
		{#each team as player, rowIndex (playerRowKey(player, rowIndex))}
			{@render playerRow(player, rowIndex)}
		{/each}
	</div>
{/snippet}

<div class="divide-secondary-800 grid grid-cols-1 md:grid-cols-2 md:divide-x">
	{@render teamColumn(alliesLabel, allies)}
	{@render teamColumn(axisLabel, axis)}
</div>
