<script lang="ts">
	import {
		doctrineBannerUrl,
		findResultPlayer,
		playerCpm,
		playerHref,
		raceFromReplayFaction,
		type CommunityMatchDetail,
		type CommunityPlayer,
		type MatchResultPlayer,
		type ParsedReplay,
		type ParsedReplayPlayer
	} from '$lib/replays';
	import { getEloColor, getEloTextShadow, isEliteElo } from '$lib/player-format';
	import { getCountryDisplayName } from '$lib/leaderboards';
	import { flagImageUrl } from '$lib/proxy-image';
	import { formatStreak, getFactionFlagByRace } from '$lib/ranks';
	import { cn } from '$lib/cn';
	import { interactive, statLosses, statWins } from '$lib/variants';
	import CaretUpIcon from 'phosphor-svelte/lib/CaretUpIcon';
	import CaretDownIcon from 'phosphor-svelte/lib/CaretDownIcon';
	import MinusIcon from 'phosphor-svelte/lib/MinusIcon';

	type Props = {
		match: CommunityMatchDetail;
		replay: ParsedReplay;
	};

	let { match, replay }: Props = $props();

	const teams = $derived.by(() => ({
		allies: replay.players.filter((player) => player.faction.startsWith('allies')),
		axis: replay.players.filter((player) => player.faction.startsWith('axis'))
	}));

	function lobbyPlayer(replayPlayer: ParsedReplayPlayer): CommunityPlayer | undefined {
		const name = replayPlayer.name.trim().toLowerCase();
		return match.players.find((player) => player.profile.alias.trim().toLowerCase() === name);
	}

	function resultPlayer(replayPlayer: ParsedReplayPlayer): MatchResultPlayer | undefined {
		const name = replayPlayer.name.trim().toLowerCase();
		const fromResult = match.result?.players?.find(
			(player) => (player.alias ?? '').trim().toLowerCase() === name
		);
		if (fromResult) return fromResult;
		const lobby = lobbyPlayer(replayPlayer);
		return lobby ? findResultPlayer(match, lobby) : undefined;
	}

	function ratingDelta(result: MatchResultPlayer): number | undefined {
		const next = result.newrating;
		const prev = result.oldrating;
		if (!Number.isFinite(next) || !Number.isFinite(prev)) return undefined;
		return (next as number) - (prev as number);
	}

	function displayElo(result: MatchResultPlayer): number | null {
		if ((result.newrating ?? 0) >= 1) return result.newrating ?? null;
		if ((result.oldrating ?? 0) >= 1) return result.oldrating ?? null;
		return null;
	}
</script>

{#snippet playerRow(player: ParsedReplayPlayer)}
	{@const lobby = lobbyPlayer(player)}
	{@const result = resultPlayer(player)}
	{@const href = lobby ? playerHref(lobby) : null}
	{@const elo = result ? displayElo(result) : null}
	{@const change = result ? ratingDelta(result) : undefined}
	{@const race = result?.race_id ?? lobby?.race ?? raceFromReplayFaction(player.faction)}
	{@const banner = doctrineBannerUrl(player)}
	{@const country = result?.country ?? null}
	{@const flagUrl = flagImageUrl(country)}
	{@const countryName = getCountryDisplayName(country)}
	<div
		class={cn(
			'border-secondary-800 relative overflow-hidden border-b last:border-b-0',
			result?.outcome === 1 && 'bg-success/5',
			result?.outcome === 0 && 'bg-destructive/5'
		)}
	>
		{#if banner}
			<img
				src={banner}
				alt=""
				aria-hidden="true"
				class="pointer-events-none absolute inset-0 h-full w-full object-cover object-left opacity-[0.16]"
			/>
			<div
				class="pointer-events-none absolute inset-0 bg-linear-to-r from-secondary-950/25 via-secondary-950/60 to-secondary-950/92"
			></div>
		{/if}
		<div class="relative flex items-center gap-4 px-4 py-3.5">
			<div class="min-w-0 flex-1">
				<div class="flex min-w-0 items-center gap-2">
					{#if flagUrl}
						<img
							src={flagUrl}
							alt={countryName ?? country ?? ''}
							title={countryName ?? undefined}
							class="h-4 w-auto shrink-0 rounded-xs"
						/>
					{/if}
					{#if href}
						<a
							href={href}
							class={cn(
								interactive,
								'min-w-0 truncate text-base font-semibold tracking-tight text-white hover:text-primary'
							)}
						>
							{player.name}
						</a>
					{:else}
						<span class="min-w-0 truncate text-base font-semibold tracking-tight text-white">
							{player.name}
						</span>
					{/if}
				</div>
				<div class="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-base tabular-nums">
					<img
						src={getFactionFlagByRace(race)}
						alt=""
						class="ring-secondary-800 size-4 shrink-0 rounded-full object-cover ring-1"
					/>
					<span class="text-secondary-200 truncate">{player.doctrineName || 'Unknown doctrine'}</span>
					{#if result}
						<span class="text-secondary-600" aria-hidden="true">·</span>
						<span class="inline-flex items-center gap-1">
							<span class={statWins}>{result.wins ?? 0}</span>
							<span class="text-secondary-500">/</span>
							<span class={statLosses}>{result.losses ?? 0}</span>
						</span>
						{#if result.streak}
							<span class="text-secondary-600" aria-hidden="true">·</span>
							<span
								class={result.streak > 0
									? 'text-green-300'
									: result.streak < 0
										? 'text-red-300'
										: 'text-secondary-400'}
							>
								{formatStreak(result.streak)}
							</span>
						{/if}
					{/if}
				</div>
			</div>
			{#if result}
				<div class="flex shrink-0 items-center gap-2.5 tabular-nums">
					{#if change !== undefined}
						<span class="inline-flex items-center gap-0.5 text-sm">
							{#if change < 0}
								<CaretDownIcon class="text-destructive size-3.5 shrink-0" weight="duotone" />
								<span class="text-red-200">{Math.abs(change)}</span>
							{:else if change > 0}
								<CaretUpIcon class="text-success size-3.5 shrink-0" weight="duotone" />
								<span class="text-green-200">{change}</span>
							{:else}
								<MinusIcon class="text-secondary-500 size-3.5 shrink-0" />
							{/if}
						</span>
					{/if}
					<span
						class={cn('text-base font-semibold', isEliteElo(elo) && 'font-bold tracking-wide')}
						style:color={elo != null ? getEloColor(elo) : undefined}
						style:text-shadow={getEloTextShadow(elo)}
					>
						{elo ?? 'N/A'}
					</span>
				</div>
			{/if}
			<div class="flex w-12 shrink-0 flex-col items-center justify-center gap-0.5">
				<span class="text-secondary-400 text-xs font-semibold tracking-wider uppercase">CPM</span>
				<span class="text-primary text-xl leading-none font-bold tabular-nums">
					{playerCpm(replay, player.id)}
				</span>
			</div>
		</div>
	</div>
{/snippet}

{#snippet teamColumn(label: string, players: ParsedReplayPlayer[])}
	<div class="min-w-0">
		<div
			class="bg-secondary-950/90 text-secondary-300 border-secondary-800 flex items-center gap-4 border-b px-4 py-2.5 text-sm font-semibold tracking-wide uppercase"
		>
			<span class="min-w-0 flex-1">{label}</span>
			<span class="text-right">Rating</span>
			<span class="text-primary w-12 text-center font-semibold">CPM</span>
		</div>
		{#each players as player (`${player.id ?? player.name}-${player.name}`)}
			{@render playerRow(player)}
		{/each}
	</div>
{/snippet}

<div class="divide-secondary-800 grid grid-cols-1 md:grid-cols-2 md:divide-x">
	{@render teamColumn('Allies', teams.allies)}
	{@render teamColumn('Axis', teams.axis)}
</div>
