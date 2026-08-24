<script lang="ts">
	import type { Player } from '@fknoobs/replay-parser';
	import type { HTMLAttributes } from 'svelte/elements';
	import { useReplay } from '.';
	import DoctrineAir from '$lib/files/ct_branchbanner_top_allied_airborne.png?url';
	import DoctrineArmored from '$lib/files/ct_branchbanner_top_allied_armor.png?url';
	import DoctrineInfantry from '$lib/files/ct_branchbanner_top_allied_infantry.png?url';
	import DoctrineBlitz from '$lib/files/ct_branchbanner_top_axis_blitz.png?url';
	import DoctrineTerror from '$lib/files/ct_branchbanner_top_axis_terror.png?url';
	import DoctrineDefense from '$lib/files/ct_branchbanner_top_axis_defense.png?url';
	import DoctrineCwAir from '$lib/files/ct_branchbanner_top_cmnw_airborne.png?url';
	import DoctrineCwArmor from '$lib/files/ct_branchbanner_top_cmnw_armor.png?url';
	import DoctrineCwInfantry from '$lib/files/ct_branchbanner_top_cmnw_infantry.png?url';
	import DoctrineLuft from '$lib/files/ct_branchbanner_top_pnze_00.png?url';
	import DoctrineSector from '$lib/files/ct_branchbanner_top_pnze_01.png?url';
	import DoctrineTank from '$lib/files/ct_branchbanner_top_pnze_02.png?url';
	import { cn, getFactionFlagFromRace } from '$lib/utils';
	import { mePlayerText } from '$lib/components/ui/variants';
	import { isMeReplayAlias } from '$lib/utils/player-me';

	type Props = {} & HTMLAttributes<HTMLDivElement> & {
		flush?: boolean;
	};

	let { flush = false, ...restProps }: Props = $props();
	let replay = $derived(useReplay());

	const teams = $derived.by(() => ({
		allies: replay.players.filter((player) => player.faction.startsWith('allies')),
		axis: replay.players.filter((player) => player.faction.startsWith('axis'))
	}));

	const playerCpm = $derived.by(() => {
		const durationMinutes = replay.duration / 60;
		const cpm = new Map<number, string>();

		for (const player of replay.players) {
			const actions = replay.actions.filter((action) => action.playerID === player.id);
			const takeoverIndex = actions.findIndex((action) => action.command?.type === 'AI_TAKEOVER') + 1;
			const counted = takeoverIndex > 0 ? actions.slice(0, takeoverIndex) : actions;
			cpm.set(
				player.id,
				durationMinutes > 0 ? (counted.length / durationMinutes).toFixed(0) : '0'
			);
		}

		return cpm;
	});

	const playerRow =
		'grid grid-cols-[3.5rem_minmax(0,1fr)_3.25rem] items-center gap-3 px-4 py-3';

	function getDoctrineImage(player: Player): string {
		if (player.faction.startsWith('allies')) {
			switch (player.doctrine) {
				case 2:
					return DoctrineAir;
				case 9:
					return DoctrineArmored;
				case 17:
					return DoctrineInfantry;
				case 316:
					return DoctrineCwInfantry;
				case 323:
					return DoctrineCwAir;
				case 330:
					return DoctrineCwArmor;
				default:
					return '';
			}
		}

		switch (player.doctrine) {
			case 186:
				return DoctrineBlitz;
			case 194:
				return DoctrineDefense;
			case 265:
				return DoctrineTerror;
			case 295:
				return DoctrineLuft;
			case 302:
				return DoctrineSector;
			case 309:
				return DoctrineTank;
			default:
				return '';
		}
	}

	function factionFlag(player: Player) {
		return getFactionFlagFromRace(
			player.faction as 'allies' | 'axis' | 'allies_commonwealth' | 'axis_panzer_elite'
		);
	}
</script>

{#snippet playerRowContent(player: Player)}
	{@const doctrineImage = getDoctrineImage(player)}
	{@const isMe = isMeReplayAlias(player.name)}
	<div class={cn(playerRow, 'border-secondary-800 border-b last:border-b-0')}>
		<span class="border-secondary-800 size-14 shrink-0 overflow-hidden rounded-lg border bg-secondary-950/80">
			{#if doctrineImage}
				<img
					src={doctrineImage}
					alt={player.doctrineName || 'Doctrine'}
					class="h-full w-full object-cover"
				/>
			{:else}
				<img src={factionFlag(player)} alt={player.faction} class="h-full w-full object-contain p-2" />
			{/if}
		</span>

		<div class="min-w-0">
			<div class="flex min-w-0 items-center gap-2">
				<img src={factionFlag(player)} alt={player.faction} class="h-4 shrink-0" />
				<span class={cn('truncate font-semibold', isMe ? mePlayerText : 'text-primary-50')}>
					{player.name}
				</span>
			</div>
			<p class="text-secondary-400 mt-0.5 truncate text-sm">
				{player.doctrineName || 'Unknown doctrine'}
			</p>
		</div>

		<span
			class="bg-primary/10 text-primary border-primary/25 ml-auto flex min-w-11 items-center justify-center rounded-md border px-2 py-1 text-lg font-bold tabular-nums"
		>
			{playerCpm.get(player.id) ?? '0'}
		</span>
	</div>
{/snippet}

{#snippet teamColumn(label: string, players: Player[])}
	<div class="min-w-0">
		<div
			class={cn(
				playerRow,
				'bg-secondary-950/90 text-secondary-300 border-secondary-800 border-b py-2! text-xs font-semibold tracking-wide uppercase'
			)}
		>
			<span aria-hidden="true"></span>
			<span>{label}</span>
			<span class="text-primary text-right font-semibold">CPM</span>
		</div>
		{#each players as player (player.id + '-' + player.name)}
			{@render playerRowContent(player)}
		{/each}
	</div>
{/snippet}

<div
	{...restProps}
	class={cn(
		'grid grid-cols-1 md:grid-cols-2',
		flush ? 'divide-secondary-800 md:divide-x' : 'gap-4',
		restProps.class
	)}
>
	<div class={cn(!flush && 'border-secondary-800 overflow-clip rounded-lg border')}>
		{@render teamColumn('Allies', teams.allies)}
	</div>
	<div class={cn(!flush && 'border-secondary-800 overflow-clip rounded-lg border')}>
		{@render teamColumn('Axis', teams.axis)}
	</div>
</div>
