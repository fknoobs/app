<script lang="ts">
	import type { PlayerEloHistoryPoint } from '$core/pocketbase/player-ratings';
	import { groupEloHistoryByModeAndRace } from '$core/pocketbase/player-ratings';
	import { MATCH_TYPES } from '$core/game/lobby';
	import { getRaceLabel } from '$lib/components/leaderboard/leaderboard-utils';
	import { cn, getFactionFlagFromRace } from '$lib/utils';
	import { interactive } from '$lib/components/ui/variants';
	import { Axis, Circle, Highlight, Layer, LineChart, Spline, Text, Tooltip } from 'layerchart';
	import { IsInViewport } from 'runed';
	import dayjs from '$lib/dayjs';

	type Props = {
		points: PlayerEloHistoryPoint[];
		loading?: boolean;
	};

	let { points, loading = false }: Props = $props();

	const grouped = $derived(groupEloHistoryByModeAndRace(points));
	const modeIds = $derived(
		Object.keys(grouped)
			.map(Number)
			.sort((a, b) => a - b)
	);

	let selectedMode = $state<number | null>(null);
	let selectedRace = $state<number | null>(null);

	const activeMode = $derived(
		selectedMode != null && modeIds.includes(selectedMode) ? selectedMode : (modeIds[0] ?? null)
	);

	const raceIds = $derived.by(() => {
		if (activeMode == null) return [] as number[];
		return Object.keys(grouped[activeMode] ?? {})
			.map(Number)
			.filter((raceId) => (grouped[activeMode]?.[raceId]?.length ?? 0) > 0)
			.sort((a, b) => a - b);
	});

	const activeRace = $derived(
		selectedRace != null && raceIds.includes(selectedRace) ? selectedRace : (raceIds[0] ?? null)
	);

	type ChartPoint = {
		at: Date;
		rating: number;
		label: string;
	};

	const chartData = $derived.by(() => {
		if (activeMode == null || activeRace == null) return [] as ChartPoint[];
		const racePoints = grouped[activeMode]?.[activeRace] ?? [];
		const label = getRaceLabel(activeRace);
		const byDay: Record<string, ChartPoint> = {};

		for (const point of racePoints) {
			const at = dayjs.unix(point.at);
			const dayKey = at.format('YYYY-MM-DD');
			byDay[dayKey] = {
				at: at.startOf('day').toDate(),
				rating: point.rating,
				label
			};
		}

		return Object.values(byDay).sort((a, b) => a.at.getTime() - b.at.getTime());
	});

	const raceLabel = $derived(activeRace != null ? getRaceLabel(activeRace) : 'Faction');

	let target = $state<HTMLElement>();
	const isInViewport = new IsInViewport(() => target);

	function modeLabel(matchtypeId: number) {
		return MATCH_TYPES[matchtypeId as keyof typeof MATCH_TYPES] ?? `Mode ${matchtypeId}`;
	}

	function selectMode(matchtypeId: number) {
		selectedMode = matchtypeId;
		selectedRace = null;
	}
</script>

{#if loading && points.length === 0}
	<p class="text-secondary-400 px-4 py-6 text-sm">Loading ELO history…</p>
{:else if points.length === 0}
	<p class="text-secondary-400 px-4 py-6 text-sm">
		No tracked match ratings yet. Play with the companion running so lobby results can build this
		history.
	</p>
{:else}
	<div class="flex flex-col">
		<div class="border-secondary-800 flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
			{#each modeIds as matchtypeId (matchtypeId)}
				<button
					type="button"
					class={cn(
						interactive,
						'rounded-md px-4 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors',
						activeMode === matchtypeId
							? 'bg-primary text-secondary-950'
							: 'text-white hover:bg-secondary-950/50'
					)}
					onclick={() => selectMode(matchtypeId)}
				>
					{modeLabel(matchtypeId)}
				</button>
			{/each}
		</div>

		{#if raceIds.length > 0 && activeRace != null}
			<div class="grid min-h-0 grid-cols-[minmax(0,13rem)_minmax(0,1fr)] items-stretch">
				<nav
					class="border-secondary-800 divide-secondary-800 flex h-full min-h-0 flex-col divide-y border-r"
					aria-label="Select faction"
				>
					{#each raceIds as raceId (raceId)}
						{@const isSelected = activeRace === raceId}
						<button
							type="button"
							class={cn(
								interactive,
								'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors',
								isSelected
									? 'bg-secondary-950/80 text-primary font-medium'
									: 'text-secondary-300 hover:bg-secondary-950/50 hover:text-white'
							)}
							aria-current={isSelected ? 'true' : undefined}
							onclick={() => (selectedRace = raceId)}
						>
							<img
								src={getFactionFlagFromRace(raceId)}
								alt={getRaceLabel(raceId)}
								class="h-3.5 shrink-0"
							/>
							<span class="min-w-0 flex-1 truncate">{getRaceLabel(raceId)}</span>
						</button>
					{/each}
				</nav>

				<div
					class="border-secondary-800 bg-secondary-950/50 h-56 w-full p-4"
					bind:this={target}
				>
					{#if isInViewport.current && chartData.length > 0}
						<div class="size-full">
							<LineChart
								data={chartData}
								x="at"
								y="rating"
								yNice
								padding={{ left: 20, bottom: 28, right: 56, top: 8 }}
								tooltip={{ mode: 'quadtree' }}
							>
								{#snippet children({ context })}
									<Layer type="svg">
										<Axis placement="left" grid rule />
										<Axis
											placement="bottom"
											rule
											format={(value) => dayjs(value as Date).format('DD MMM')}
										/>
										<Spline
											data={chartData}
											y="rating"
											class="stroke-primary stroke-2"
											draw={{ duration: 0 }}
										>
											{#snippet endContent()}
												<Circle r={3.5} class="stroke-primary text-primary" />
												<Text
													value={raceLabel}
													verticalAnchor="middle"
													dx={6}
													dy={-2}
													class="text-primary text-[10px]"
												/>
											{/snippet}
										</Spline>
										<Highlight points lines />
									</Layer>
									<Tooltip.Root>
										<Tooltip.Header>
											{context.tooltip.data?.label ?? raceLabel}
										</Tooltip.Header>
										<Tooltip.List>
											<Tooltip.Item
												label={dayjs(context.tooltip.data?.at).format('DD MMM YYYY')}
												value={`${context.tooltip.data?.rating ?? '—'} ELO`}
											/>
										</Tooltip.List>
									</Tooltip.Root>
								{/snippet}
							</LineChart>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<p class="text-secondary-400 px-4 py-4 text-sm">No faction ratings for this mode yet.</p>
		{/if}
	</div>
{/if}
