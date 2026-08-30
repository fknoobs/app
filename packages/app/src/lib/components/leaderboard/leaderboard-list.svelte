<script lang="ts">
	import type { LeaderboardStatWithProfile } from '@fknoobs/app';
	import { DataTable, type ColumnDef } from '$lib/components/ui/table';
	import { cn, getRankImageByLeaderboardId } from '$lib/utils';
	import { getStoredEloForLeaderboard, type PlayerEloMap } from '$lib/utils/player-elo';
	import { upperCase } from 'lodash-es';
	import { tooltip } from '$lib/attachments';
	import LeaderboardStatPill from './leaderboard-stat-pill.svelte';
	import {
		getCountryDisplayName,
		getEloColor,
		getEloTextShadow,
		getSteamIdFromProfile,
		isEliteElo
	} from './leaderboard-utils';
	import { useI18n } from '$lib/i18n';
	import PlayerLabels from '$lib/components/player/player-labels.svelte';

	type Props = {
		stats: LeaderboardStatWithProfile[];
		eloBySteamId?: Map<string, PlayerEloMap>;
		loading?: boolean;
		empty?: string;
		class?: string;
		striped?: boolean;
	};

	let {
		stats,
		eloBySteamId = new Map(),
		loading = false,
		empty = 'No players found.',
		class: className,
		striped = false
	}: Props = $props();
	const { t } = useI18n();

	const centeredHeader = 'flex w-full justify-center';
	const centeredCell = 'flex w-full justify-center';

	function eloForRow(row: LeaderboardStatWithProfile): number | null {
		return getStoredEloForLeaderboard(
			eloBySteamId.get(getSteamIdFromProfile(row.profile)),
			row.leaderboard_id
		);
	}

	const columns: ColumnDef<LeaderboardStatWithProfile>[] = $derived([
		{
			id: 'rank',
			header: '#',
			width: 'w-[3rem]',
			headerClass: centeredHeader,
			class: `${centeredCell} text-secondary-400 font-semibold tabular-nums`,
			accessor: (stat) => stat.rank
		},
		{
			id: 'ranklevel',
			header: t('Rank'),
			width: 'w-[5.5rem]',
			class: 'flex w-full items-center gap-2'
		},
		{
			id: 'alias',
			header: t('Alias'),
			class: 'flex w-full min-w-0 items-center gap-2 font-medium'
		},
		{
			id: 'elo',
			header: t('ELO'),
			width: 'w-[5rem]',
			headerClass: centeredHeader,
			class: `${centeredCell} tabular-nums`
		},
		{
			id: 'wins',
			header: t('Wins'),
			width: 'w-[4.5rem]',
			headerClass: centeredHeader,
			class: centeredCell
		},
		{
			id: 'losses',
			header: t('Losses'),
			width: 'w-[4.5rem]',
			headerClass: centeredHeader,
			class: centeredCell
		},
		{
			id: 'streak',
			header: t('Streak'),
			width: 'w-[4.5rem]',
			headerClass: centeredHeader,
			class: centeredCell
		},
		{
			id: 'ratio',
			header: t('Ratio'),
			width: 'w-[4.5rem]',
			headerClass: centeredHeader,
			class: centeredCell
		}
	]);
</script>

{#snippet cell_ranklevel({ row }: { row: LeaderboardStatWithProfile })}
	<img
		src={getRankImageByLeaderboardId(row.leaderboard_id, row.ranklevel)}
		alt={t('Rank {level}', { level: row.ranklevel })}
		class="size-6 shrink-0"
	/>
	<span class="text-secondary-400 text-sm tabular-nums">{row.ranklevel}</span>
{/snippet}
{#snippet cell_alias({ row }: { row: LeaderboardStatWithProfile })}
	{#if row.profile?.country}
		{@const countryName = getCountryDisplayName(row.profile.country)}
		<img
			class="h-4 w-auto shrink-0 rounded-xs"
			src="https://flagsapi.com/{upperCase(row.profile.country)}/shiny/64.png"
			alt={countryName ?? row.profile.country}
			{@attach tooltip(countryName ?? row.profile.country)}
		/>
	{/if}
	<span class="truncate">{row.profile?.alias}</span>
	{#if row.profile}
		<PlayerLabels steamId={getSteamIdFromProfile(row.profile)} class="shrink-0" />
	{/if}
{/snippet}
{#snippet cell_elo({ row }: { row: LeaderboardStatWithProfile })}
	{@const value = eloForRow(row)}
	{#if value == null}
		<span class="text-secondary-500 text-xs">{t('N/A')}</span>
	{:else}
		<span
			class={cn('tabular-nums', isEliteElo(value) ? 'font-bold tracking-wide' : 'font-medium')}
			style:color={getEloColor(value)}
			style:text-shadow={getEloTextShadow(value)}
		>
			{value}
		</span>
	{/if}
{/snippet}
{#snippet cell_wins({ row }: { row: LeaderboardStatWithProfile })}
	<LeaderboardStatPill type="wins" wins={row.wins} losses={row.losses} streak={row.streak} />
{/snippet}
{#snippet cell_losses({ row }: { row: LeaderboardStatWithProfile })}
	<LeaderboardStatPill type="losses" wins={row.wins} losses={row.losses} streak={row.streak} />
{/snippet}
{#snippet cell_streak({ row }: { row: LeaderboardStatWithProfile })}
	<LeaderboardStatPill type="streak" wins={row.wins} losses={row.losses} streak={row.streak} />
{/snippet}
{#snippet cell_ratio({ row }: { row: LeaderboardStatWithProfile })}
	<LeaderboardStatPill type="ratio" wins={row.wins} losses={row.losses} streak={row.streak} />
{/snippet}

<DataTable
	class={className}
	data={stats}
	{columns}
	{loading}
	empty={t(empty)}
	{striped}
	rowKey={(stat) => stat.profile.profile_id}
	rowHref={(stat) => `/players/${stat.profile.profile_id}`}
	tableLayout="auto"
	cells={{
		ranklevel: cell_ranklevel,
		alias: cell_alias,
		elo: cell_elo,
		wins: cell_wins,
		losses: cell_losses,
		streak: cell_streak,
		ratio: cell_ratio
	}}
/>
