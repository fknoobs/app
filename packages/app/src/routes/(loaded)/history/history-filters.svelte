<script lang="ts">
	import { Selection } from '$lib/components/ui/input';
	import { cn } from '$lib/utils';
	import { interactive, tabTrigger } from '$lib/components/ui/variants';
	import type {
		CompareFilter,
		HistoryMatchup,
		Matches
	} from '$core/app/features/history/matches.svelte';
	import type { FilterOperator } from '$core/app/database/matches';
	import { Race } from '$lib/utils/game';
	import { useI18n } from '$lib/i18n';
	import PlusIcon from 'phosphor-svelte/lib/PlusIcon';
	import XIcon from 'phosphor-svelte/lib/XIcon';

	type FilterKey =
		| 'ranked'
		| 'pro'
		| 'players'
		| 'maps'
		| 'races'
		| 'matchups'
		| 'positions'
		| 'elo'
		| 'duration';

	interface Props {
		matches: Matches;
	}

	let { matches }: Props = $props();
	const { t } = useI18n();

	const factionOptions = [
		{ label: 'USA', value: String(Race.US) },
		{ label: 'Wehrmacht', value: String(Race.Wehrmacht) },
		{ label: 'Commonwealth', value: String(Race.Commonwealth) },
		{ label: 'Panzer Elite', value: String(Race.PanzerElite) }
	];

	const matchupOptions: { label: string; value: HistoryMatchup }[] = [
		{ label: t('1v1'), value: '1v1' },
		{ label: t('2v2'), value: '2v2' },
		{ label: t('3v3'), value: '3v3' },
		{ label: t('4v4'), value: '4v4' }
	];

	const positionOptions = ['1', '2', '3', '4'].map((value) => ({
		label: value,
		value
	}));

	const operators: FilterOperator[] = ['gt', 'gte', 'lt', 'lte'];
	const operatorSymbol: Record<FilterOperator, string> = {
		gt: '>',
		gte: '≥',
		lt: '<',
		lte: '≤'
	};

	let playersOpen = $state(false);
	let mapsOpen = $state(false);
	let racesOpen = $state(false);
	let matchupsOpen = $state(false);
	let positionsOpen = $state(false);

	const activeKeys = $derived.by((): FilterKey[] => {
		const keys: FilterKey[] = [];
		if (matches.filters.ranked) keys.push('ranked');
		if (matches.filters.pro) keys.push('pro');
		if (matches.filters.playerIds !== undefined) keys.push('players');
		if (matches.filters.maps !== undefined) keys.push('maps');
		if (matches.filters.races !== undefined) keys.push('races');
		if (matches.filters.matchups !== undefined) keys.push('matchups');
		if (matches.filters.positions !== undefined) keys.push('positions');
		if (matches.filters.elo) keys.push('elo');
		if (matches.filters.duration) keys.push('duration');
		return keys;
	});

	const availableKeys = $derived.by((): { key: FilterKey; label: string }[] => {
		const items: { key: FilterKey; label: string }[] = [
			{ key: 'ranked', label: t('Ranked') },
			{ key: 'pro', label: t('Pro games') },
			{ key: 'players', label: t('Players') },
			{ key: 'maps', label: t('Maps') },
			{ key: 'races', label: t('Faction') },
			{ key: 'matchups', label: t('Game mode') },
			{ key: 'positions', label: t('Position') },
			{ key: 'elo', label: t('ELO') },
			{ key: 'duration', label: t('Duration') }
		];
		return items.filter((item) => !activeKeys.includes(item.key));
	});

	function addFilter(key: FilterKey) {
		if (key === 'ranked') matches.filters.ranked = true;
		if (key === 'pro') matches.filters.pro = true;
		if (key === 'players') {
			matches.filters.playerIds = matches.filters.playerIds ?? [];
			playersOpen = true;
		}
		if (key === 'maps') {
			matches.filters.maps = matches.filters.maps ?? [];
			mapsOpen = true;
		}
		if (key === 'races') {
			matches.filters.races = matches.filters.races ?? [];
			racesOpen = true;
		}
		if (key === 'matchups') {
			matches.filters.matchups = matches.filters.matchups ?? [];
			matchupsOpen = true;
		}
		if (key === 'positions') {
			matches.filters.positions = matches.filters.positions ?? [];
			positionsOpen = true;
		}
		if (key === 'elo') matches.filters.elo = { op: 'gt', value: 1800 };
		if (key === 'duration') matches.filters.duration = { op: 'gte', value: 20 };
	}

	function removeFilter(key: FilterKey) {
		if (key === 'ranked') matches.filters.ranked = false;
		if (key === 'pro') matches.filters.pro = false;
		if (key === 'players') matches.filters.playerIds = undefined;
		if (key === 'maps') matches.filters.maps = undefined;
		if (key === 'races') matches.filters.races = undefined;
		if (key === 'matchups') matches.filters.matchups = undefined;
		if (key === 'positions') matches.filters.positions = undefined;
		if (key === 'elo') matches.filters.elo = undefined;
		if (key === 'duration') matches.filters.duration = undefined;
	}

	function playersLabel() {
		const ids = matches.filters.playerIds ?? [];
		if (ids.length === 0) return t('Select players');
		if (ids.length === 1) {
			return matches.playerOptions.find((option) => option.value === ids[0])?.label ?? ids[0];
		}
		return t('{count} selected', { count: ids.length });
	}

	function mapsLabel() {
		const maps = matches.filters.maps ?? [];
		if (maps.length === 0) return t('Select maps');
		if (maps.length === 1) {
			return matches.mapOptions.find((option) => option.value === maps[0])?.label ?? maps[0];
		}
		return t('{count} selected', { count: maps.length });
	}

	function racesLabel() {
		const races = matches.filters.races ?? [];
		if (races.length === 0) return t('Select factions');
		if (races.length === 1) {
			return factionOptions.find((option) => option.value === races[0])?.label ?? races[0];
		}
		return t('{count} selected', { count: races.length });
	}

	function matchupsLabel() {
		const matchups = matches.filters.matchups ?? [];
		if (matchups.length === 0) return t('Select game modes');
		if (matchups.length === 1) {
			return matchupOptions.find((option) => option.value === matchups[0])?.label ?? matchups[0];
		}
		return t('{count} selected', { count: matchups.length });
	}

	function positionsLabel() {
		const positions = matches.filters.positions ?? [];
		if (positions.length === 0) return t('Select positions');
		if (positions.length === 1) {
			return positions[0];
		}
		return t('{count} selected', { count: positions.length });
	}

	function cycleOperator(filter: CompareFilter) {
		const index = operators.indexOf(filter.op);
		filter.op = operators[(index + 1) % operators.length];
	}

	function setCompareValue(filter: CompareFilter, raw: string) {
		const value = Number(String(raw).replace(/[^0-9]/g, ''));
		if (Number.isFinite(value)) filter.value = value;
	}

	const chipClass = cn(tabTrigger, 'inline-flex items-center gap-1 font-normal');
	const chipRemoveClass = cn(interactive, 'text-secondary-400 hover:text-destructive/80 p-0.5');
	const chipControlClass = cn(
		interactive,
		'hover:bg-secondary-700/40 focus-visible:bg-secondary-700/40 px-0.5'
	);
	const chipInputClass =
		'hover:bg-secondary-700/40 focus:bg-secondary-700/40 w-11 min-w-0 bg-transparent px-0.5 text-center text-sm tabular-nums outline-none';
</script>

<div class="flex flex-wrap items-center gap-2">
	{#if matches.filters.ranked}
		<span class={chipClass} data-state="active">
			<span>{t('Ranked')}</span>
			<button
				type="button"
				class={chipRemoveClass}
				aria-label={t('Remove')}
				onclick={() => removeFilter('ranked')}
			>
				<XIcon size={12} />
			</button>
		</span>
	{/if}

	{#if matches.filters.pro}
		<span class={chipClass} data-state="active">
			<span>{t('Pro games')}</span>
			<button
				type="button"
				class={chipRemoveClass}
				aria-label={t('Remove')}
				onclick={() => removeFilter('pro')}
			>
				<XIcon size={12} />
			</button>
		</span>
	{/if}

	{#if matches.filters.playerIds !== undefined}
		<span class={chipClass} data-state="active">
			<button type="button" class={cn(interactive, 'max-w-48 truncate')} onclick={() => (playersOpen = true)}>
				{playersLabel()}
			</button>
			<button
				type="button"
				class={chipRemoveClass}
				aria-label={t('Remove')}
				onclick={() => removeFilter('players')}
			>
				<XIcon size={12} />
			</button>
			<Selection
				bind:open={playersOpen}
				bind:value={matches.filters.playerIds}
				options={matches.playerOptions}
				multiple
				hideTrigger
				placeholder={t('Select players')}
				onSearch={(query) => matches.searchPlayers(query)}
			/>
		</span>
	{/if}

	{#if matches.filters.maps !== undefined}
		<span class={chipClass} data-state="active">
			<button type="button" class={cn(interactive, 'max-w-48 truncate')} onclick={() => (mapsOpen = true)}>
				{mapsLabel()}
			</button>
			<button
				type="button"
				class={chipRemoveClass}
				aria-label={t('Remove')}
				onclick={() => removeFilter('maps')}
			>
				<XIcon size={12} />
			</button>
			<Selection
				bind:open={mapsOpen}
				bind:value={matches.filters.maps}
				options={matches.mapOptions}
				multiple
				hideTrigger
				placeholder={t('Select maps')}
				onSearch={(query) => matches.searchMaps(query)}
			/>
		</span>
	{/if}

	{#if matches.filters.races !== undefined}
		<span class={chipClass} data-state="active">
			<button type="button" class={cn(interactive, 'max-w-48 truncate')} onclick={() => (racesOpen = true)}>
				{racesLabel()}
			</button>
			<button
				type="button"
				class={chipRemoveClass}
				aria-label={t('Remove')}
				onclick={() => removeFilter('races')}
			>
				<XIcon size={12} />
			</button>
			<Selection
				bind:open={racesOpen}
				bind:value={matches.filters.races}
				options={factionOptions}
				multiple
				hideTrigger
				placeholder={t('Select factions')}
			/>
		</span>
	{/if}

	{#if matches.filters.matchups !== undefined}
		<span class={chipClass} data-state="active">
			<button type="button" class={cn(interactive, 'max-w-48 truncate')} onclick={() => (matchupsOpen = true)}>
				{matchupsLabel()}
			</button>
			<button
				type="button"
				class={chipRemoveClass}
				aria-label={t('Remove')}
				onclick={() => removeFilter('matchups')}
			>
				<XIcon size={12} />
			</button>
			<Selection
				bind:open={matchupsOpen}
				bind:value={matches.filters.matchups}
				options={matchupOptions}
				multiple
				hideTrigger
				placeholder={t('Select game modes')}
			/>
		</span>
	{/if}

	{#if matches.filters.positions !== undefined}
		<span class={chipClass} data-state="active">
			<button type="button" class={cn(interactive, 'max-w-48 truncate')} onclick={() => (positionsOpen = true)}>
				{positionsLabel()}
			</button>
			<button
				type="button"
				class={chipRemoveClass}
				aria-label={t('Remove')}
				onclick={() => removeFilter('positions')}
			>
				<XIcon size={12} />
			</button>
			<Selection
				bind:open={positionsOpen}
				bind:value={matches.filters.positions}
				options={positionOptions}
				multiple
				hideTrigger
				placeholder={t('Select positions')}
			/>
		</span>
	{/if}

	{#snippet compareChip(
		label: string,
		filter: CompareFilter,
		unit: string | undefined,
		onRemove: () => void
	)}
		<span class={chipClass} data-state="active">
			<span>{label}</span>
			<button
				type="button"
				class={chipControlClass}
				title={t('Change operator')}
				aria-label={t('Change operator')}
				onclick={() => cycleOperator(filter)}
			>
				{operatorSymbol[filter.op]}
			</button>
			<input
				type="text"
				inputmode="numeric"
				autocomplete="off"
				spellcheck="false"
				class={chipInputClass}
				value={String(filter.value)}
				oninput={(event) => setCompareValue(filter, event.currentTarget.value)}
			/>
			{#if unit}
				<span class="text-secondary-400">{unit}</span>
			{/if}
			<button type="button" class={chipRemoveClass} aria-label={t('Remove')} onclick={onRemove}>
				<XIcon size={12} />
			</button>
		</span>
	{/snippet}

	{#if matches.filters.elo}
		{@render compareChip(t('ELO'), matches.filters.elo, undefined, () => removeFilter('elo'))}
	{/if}

	{#if matches.filters.duration}
		{@render compareChip(t('Duration'), matches.filters.duration, t('min'), () =>
			removeFilter('duration')
		)}
	{/if}

	{#each availableKeys as item (item.key)}
		<button
			type="button"
			class={cn(tabTrigger, 'inline-flex items-center gap-1')}
			onclick={() => addFilter(item.key)}
		>
			<PlusIcon size={14} />
			{item.label}
		</button>
	{/each}
</div>
