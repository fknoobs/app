<script lang="ts">
	import type { LeaderboardStat } from '@fknoobs/app';
	import { cn, getRankImageByLeaderboardId } from '$lib/utils';
	import { getFactionFlagFromLeaderboardId, isRanked } from '$lib/utils/game';
	import { getStoredEloForLeaderboard, type PlayerEloMap } from '$lib/utils/player-elo';
	import {
		getEloColor,
		getEloTextShadow,
		getRaceLabelFromLeaderboardId,
		isEliteElo
	} from './leaderboard-utils';
	import { useI18n } from '$lib/i18n';

	type ModeRow = {
		label: string;
		stat: LeaderboardStat | null;
		rating: number | null;
	};

	type Props = {
		stats: LeaderboardStat[];
		elo?: PlayerEloMap;
		class?: string;
	};

	let { stats, elo, class: className }: Props = $props();
	const { t } = useI18n();

	const MODE_GROUPS = [
		{ label: '1v1', ids: [4, 5, 6, 7] },
		{ label: '2v2', ids: [8, 9, 10, 11] },
		{ label: '3v3', ids: [12, 13, 14, 15] },
		{ label: '4v4', ids: [16, 17, 18, 19] }
	] as const;

	const rows = $derived.by(() => {
		const result: ModeRow[] = [];
		for (const group of MODE_GROUPS) {
			const candidates = stats.filter(
				(stat) =>
					isRanked(stat.leaderboard_id) &&
					(group.ids as readonly number[]).includes(stat.leaderboard_id)
			);
			let best: LeaderboardStat | null = null;
			let bestScore = Number.NEGATIVE_INFINITY;
			for (const stat of candidates) {
				const rating = getStoredEloForLeaderboard(elo, stat.leaderboard_id) ?? 0;
				const score = rating * 1000 + stat.ranklevel;
				if (score > bestScore) {
					best = stat;
					bestScore = score;
				}
			}
			result.push({
				label: group.label,
				stat: best,
				rating: best ? getStoredEloForLeaderboard(elo, best.leaderboard_id) : null
			});
		}
		return result;
	});
</script>

<div class={cn('col-span-4 grid min-h-0 grid-cols-4', className)}>
	{#each rows as row (row.label)}
		<div
			class="border-secondary-800 flex h-full flex-col items-center justify-center border-r px-2 py-3 text-center"
		>
			<dt class="text-secondary-500 text-xs font-medium uppercase">{row.label}</dt>
			<dd class="mt-1 flex flex-col items-center gap-1">
				{#if row.stat}
					<span class="inline-flex items-center gap-1.5">
						<img
							src={getFactionFlagFromLeaderboardId(row.stat.leaderboard_id)}
							alt={getRaceLabelFromLeaderboardId(row.stat.leaderboard_id)}
							class="h-4 w-4 shrink-0 rounded-full object-cover ring-1 ring-black/40"
						/>
						{#if row.rating == null}
							<span class="text-secondary-500 text-sm">{t('N/A')}</span>
						{:else}
							<span
								class={cn(
									'font-heading text-lg tabular-nums',
									isEliteElo(row.rating) ? 'font-bold tracking-wide' : 'font-medium'
								)}
								style:color={getEloColor(row.rating)}
								style:text-shadow={getEloTextShadow(row.rating)}
							>
								{row.rating}
							</span>
						{/if}
					</span>
					{#if row.stat.ranklevel > 0}
						<span class="inline-flex items-center gap-1">
							<img
								src={getRankImageByLeaderboardId(row.stat.leaderboard_id, row.stat.ranklevel)}
								alt={t('Rank {level}', { level: row.stat.ranklevel })}
								class="h-6 w-auto shrink-0"
							/>
							<span class="text-secondary-300 text-sm font-medium tabular-nums">
								{row.stat.ranklevel}
							</span>
						</span>
					{/if}
				{:else}
					<span class="text-secondary-500">–</span>
				{/if}
			</dd>
		</div>
	{/each}
</div>
