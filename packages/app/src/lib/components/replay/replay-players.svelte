<script lang="ts">
	import type { Player } from '@fknoobs/replay-parser';
	import type { LobbyPlayer, MatchHistoryPlayer, TransformedMatch } from '@fknoobs/app';
	import type { MatchExpanded } from '$core/app/database/matches';
	import type { HTMLAttributes } from 'svelte/elements';
	import { useReplay } from '.';
	import * as PlayerUi from '$lib/components/player';
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
	import { interactive, mePlayerText } from '$lib/components/ui/variants';
	import { isMeReplayAlias } from '$lib/utils/player-me';
	import { getLeaderboardStatsForPlayerByMatchType } from '$lib/utils/game';
	import {
		getLiveLobbyMatchType,
		getPlayerAlias,
		getPlayerProfileId
	} from '$lib/components/widgets/dashboard-utils';
	import { useI18n } from '$lib/i18n';

	type Props = {} & HTMLAttributes<HTMLDivElement> & {
		flush?: boolean;
		match?: MatchExpanded | null;
	};

	let { flush = false, match = null, ...restProps }: Props = $props();
	const { t } = useI18n();
	let replay = $derived(useReplay());

	const teams = $derived.by(() => ({
		allies: replay.players.filter((player) => player.faction.startsWith('allies')),
		axis: replay.players.filter((player) => player.faction.startsWith('axis'))
	}));

	const result = $derived((match?.result as TransformedMatch | null | undefined) ?? null);
	const matchType = $derived(
		result?.matchtype_id ?? getLiveLobbyMatchType(match?.players ?? [], match?.isRanked ?? false)
	);
	const showMatchStats = $derived(!!match);

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

	function findLobbyPlayer(replayPlayer: Player): LobbyPlayer | undefined {
		if (!match?.players?.length) return undefined;
		const name = replayPlayer.name.trim().toLowerCase();
		return match.players.find((player) => getPlayerAlias(player).trim().toLowerCase() === name);
	}

	function findResultPlayer(lobbyPlayer: LobbyPlayer | undefined): MatchHistoryPlayer | undefined {
		if (!result || !lobbyPlayer) return undefined;
		const profileId = lobbyPlayer.profile_id ?? lobbyPlayer.profile?.profile_id ?? lobbyPlayer.playerId;
		if (profileId == null || profileId <= 0) return undefined;
		return result.players.find((entry) => entry.profile_id === profileId);
	}
</script>

{#snippet playerRowContent(player: Player)}
	{@const doctrineImage = getDoctrineImage(player)}
	{@const isMe = isMeReplayAlias(player.name)}
	{@const lobbyPlayer = findLobbyPlayer(player)}
	{@const playerResult = findResultPlayer(lobbyPlayer)}
	{@const outcome = playerResult?.outcome}
	{@const stats = lobbyPlayer
		? getLeaderboardStatsForPlayerByMatchType(result?.matchtype_id ?? matchType, lobbyPlayer)
		: undefined}
	{@const doctrineLabel = player.doctrineName || t('Unknown doctrine')}
	{@const profileId = lobbyPlayer ? getPlayerProfileId(lobbyPlayer) : undefined}
	{@const nameClass = cn(
		'min-w-0 truncate text-base font-semibold tracking-tight transition-colors',
		isMe ? mePlayerText : 'text-primary-50',
		profileId && cn(interactive, 'hover:text-primary')
	)}
	<div
		class={cn(
			'border-secondary-800 relative overflow-hidden border-b last:border-b-0',
			outcome === 1 && 'bg-success/5',
			outcome === 0 && 'bg-destructive/5'
		)}
	>
		{#if doctrineImage}
			<img
				src={doctrineImage}
				alt=""
				aria-hidden="true"
				class="pointer-events-none absolute inset-0 h-full w-full object-cover object-left opacity-[0.16]"
			/>
			<div
				class="pointer-events-none absolute inset-0 bg-linear-to-r from-secondary-950/25 via-secondary-950/60 to-secondary-950/92"
			></div>
		{/if}

		<div class="relative flex items-center gap-4 px-4 py-3.5">
			{#snippet playerHeading(showCountry: boolean)}
				<div class="flex min-w-0 items-center gap-2">
					{#if showCountry}
						<PlayerUi.Country variant="flag" />
					{/if}
					{#if profileId}
						<a href="/players/{profileId}" class={nameClass}>{player.name}</a>
					{:else}
						<span class={nameClass}>{player.name}</span>
					{/if}
				</div>
			{/snippet}
			{#if showMatchStats && lobbyPlayer}
				<PlayerUi.Root
					player={lobbyPlayer}
					{playerResult}
					{stats}
					race={playerResult?.race_id ?? lobbyPlayer.race}
				>
					<div class="flex min-w-0 flex-1 items-center gap-3.5">
						<div class="min-w-0 flex-1">
							{@render playerHeading(true)}
							<div
								class="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-base tabular-nums"
							>
								<img
									src={factionFlag(player)}
									alt={player.faction}
									class="ring-secondary-800 h-4 w-4 shrink-0 rounded-full object-cover ring-1"
								/>
								<span class="text-secondary-200 truncate">{doctrineLabel}</span>
								<span class="text-secondary-600" aria-hidden="true">·</span>
								<span class="text-secondary-200 inline-flex items-center gap-1">
									<PlayerUi.Rank class="h-5 w-5" />
									<span class="text-secondary-400">{t('Lv')}</span>
									<PlayerUi.Level class="text-secondary-100" />
								</span>
								<span class="text-secondary-600" aria-hidden="true">·</span>
								<span class="text-secondary-200 inline-flex items-center gap-1">
									<span class="text-secondary-400">#</span>
									<PlayerUi.Position class="text-secondary-100" />
								</span>
								<span class="text-secondary-600" aria-hidden="true">·</span>
								<span class="inline-flex items-center gap-1">
									<PlayerUi.Wins />
									<span class="text-secondary-500">/</span>
									<PlayerUi.Losses />
								</span>
								<span class="text-secondary-600" aria-hidden="true">·</span>
								<PlayerUi.Streak />
							</div>
						</div>
						<div class="flex shrink-0 items-center gap-2.5 tabular-nums">
							<PlayerUi.RatingChange />
							<PlayerUi.Rating
								class="text-base font-semibold"
								matchType={result?.matchtype_id ?? matchType}
							/>
						</div>
					</div>
				</PlayerUi.Root>
			{:else if lobbyPlayer}
				<PlayerUi.Root
					player={lobbyPlayer}
					{playerResult}
					{stats}
					race={playerResult?.race_id ?? lobbyPlayer.race}
				>
					<div class="min-w-0 flex-1">
						{@render playerHeading(true)}
						<div class="text-secondary-300 mt-1 flex min-w-0 items-center gap-1.5 text-base">
							<img
								src={factionFlag(player)}
								alt={player.faction}
								class="ring-secondary-800 h-4 w-4 shrink-0 rounded-full object-cover ring-1"
							/>
							<span class="truncate">{doctrineLabel}</span>
						</div>
					</div>
				</PlayerUi.Root>
			{:else}
				<div class="min-w-0 flex-1">
					{@render playerHeading(false)}
					<div class="text-secondary-300 mt-1 flex min-w-0 items-center gap-1.5 text-base">
						<img
							src={factionFlag(player)}
							alt={player.faction}
							class="ring-secondary-800 h-4 w-4 shrink-0 rounded-full object-cover ring-1"
						/>
						<span class="truncate">{doctrineLabel}</span>
					</div>
				</div>
			{/if}

			<div class="flex w-12 shrink-0 flex-col items-center justify-center gap-0.5">
				<span class="text-secondary-400 text-xs font-semibold tracking-wider uppercase">
					{t('CPM')}
				</span>
				<span class="text-primary text-xl leading-none font-bold tabular-nums">
					{playerCpm.get(player.id) ?? '0'}
				</span>
			</div>
		</div>
	</div>
{/snippet}

{#snippet teamColumn(label: string, players: Player[])}
	<div class="min-w-0">
		<div
			class="bg-secondary-950/90 text-secondary-300 border-secondary-800 flex items-center gap-4 border-b px-4 py-2.5 text-sm font-semibold tracking-wide uppercase"
		>
			<span class="min-w-0 flex-1">{label}</span>
			{#if showMatchStats}
				<span class="text-right">{t('Rating')}</span>
			{/if}
			<span class="text-primary w-12 text-center font-semibold">{t('CPM')}</span>
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
		{@render teamColumn(t('Allies'), teams.allies)}
	</div>
	<div class={cn(!flush && 'border-secondary-800 overflow-clip rounded-lg border')}>
		{@render teamColumn(t('Axis'), teams.axis)}
	</div>
</div>
