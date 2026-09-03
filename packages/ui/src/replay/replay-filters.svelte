<script lang="ts">
	import { Selection } from '@company-of-heroes/ui/input';
	import { cn } from '@company-of-heroes/ui/cn';
	import { interactive, tabTrigger } from '@company-of-heroes/ui/variants';
	import type {
		CompareFilter,
		FilterOperator,
		HistoryMapOption,
		HistoryMatchup,
		ReplaysQuery
	} from './types';
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

	type SelectOption = { value: string; label: string };

	type FilterLabels = {
		ranked: string;
		proGames: string;
		players: string;
		maps: string;
		faction: string;
		gameMode: string;
		position: string;
		elo: string;
		duration: string;
		selectPlayers: string;
		selectMaps: string;
		selectFactions: string;
		selectGameModes: string;
		selectPositions: string;
		selectedCount: string;
		remove: string;
		changeOperator: string;
		minutes: string;
	};

	type Props = {
		query: ReplaysQuery;
		maps: HistoryMapOption[];
		onChange: (patch: Partial<ReplaysQuery>) => void;
		onSearchPlayers?: (query: string) => Promise<SelectOption[]>;
		onSearchMaps?: (query: string) => Promise<SelectOption[]>;
		labels?: Partial<FilterLabels>;
	};

	const defaultLabels: FilterLabels = {
		ranked: 'Ranked',
		proGames: 'Pro games',
		players: 'Players',
		maps: 'Maps',
		faction: 'Faction',
		gameMode: 'Game mode',
		position: 'Position',
		elo: 'ELO',
		duration: 'Duration',
		selectPlayers: 'Select players',
		selectMaps: 'Select maps',
		selectFactions: 'Select factions',
		selectGameModes: 'Select game modes',
		selectPositions: 'Select positions',
		selectedCount: '{count} selected',
		remove: 'Remove',
		changeOperator: 'Change operator',
		minutes: 'min'
	};

	let { query, maps, onChange, onSearchPlayers, onSearchMaps, labels }: Props = $props();
	const l = $derived({ ...defaultLabels, ...labels });

	const factionOptions = [
		{ label: 'USA', value: '0' },
		{ label: 'Wehrmacht', value: '1' },
		{ label: 'Commonwealth', value: '2' },
		{ label: 'Panzer Elite', value: '3' }
	];
	const matchupOptions: { label: string; value: HistoryMatchup }[] = [
		{ label: '1v1', value: '1v1' },
		{ label: '2v2', value: '2v2' },
		{ label: '3v3', value: '3v3' },
		{ label: '4v4', value: '4v4' }
	];
	const positionOptions = ['1', '2', '3', '4'].map((value) => ({ label: value, value }));
	const operators: FilterOperator[] = ['gt', 'gte', 'lt', 'lte'];
	const operatorSymbol: Record<FilterOperator, string> = {
		gt: '>',
		gte: '≥',
		lt: '<',
		lte: '≤'
	};

	let extra = $state<Partial<Record<FilterKey, boolean>>>({});
	let playersOpen = $state(false);
	let mapsOpen = $state(false);
	let racesOpen = $state(false);
	let matchupsOpen = $state(false);
	let positionsOpen = $state(false);
	let playerOptions = $state<SelectOption[]>([]);
	let playerLabels = $state<Record<string, string>>({});
	let mapOptions = $state<SelectOption[]>([]);
	let eloDraft = $state('1800');
	let durationDraft = $state('20');
	let eloEditing = $state(false);
	let durationEditing = $state(false);
	let eloTimer: ReturnType<typeof setTimeout> | undefined;
	let durationTimer: ReturnType<typeof setTimeout> | undefined;

	const eloInput = $derived(eloEditing ? eloDraft : String(query.elo?.value ?? 1800));
	const durationInput = $derived(
		durationEditing ? durationDraft : String(query.duration?.value ?? 20)
	);

	const mapSelectOptions = $derived(
		maps.map((item) => ({ value: item.map, label: item.name || item.map }))
	);

	const ranked = $derived(query.ranked || extra.ranked === true);
	const pro = $derived(query.pro || extra.pro === true);
	const playersOn = $derived(query.playerIds.length > 0 || extra.players === true);
	const mapsOn = $derived(query.maps.length > 0 || extra.maps === true);
	const racesOn = $derived(query.races.length > 0 || extra.races === true);
	const matchupsOn = $derived(query.matchups.length > 0 || extra.matchups === true);
	const positionsOn = $derived(query.positions.length > 0 || extra.positions === true);
	const eloOn = $derived(query.elo != null || extra.elo === true);
	const durationOn = $derived(query.duration != null || extra.duration === true);

	const activeKeys = $derived.by((): FilterKey[] => {
		const keys: FilterKey[] = [];
		if (ranked) keys.push('ranked');
		if (pro) keys.push('pro');
		if (playersOn) keys.push('players');
		if (mapsOn) keys.push('maps');
		if (racesOn) keys.push('races');
		if (matchupsOn) keys.push('matchups');
		if (positionsOn) keys.push('positions');
		if (eloOn) keys.push('elo');
		if (durationOn) keys.push('duration');
		return keys;
	});

	const availableKeys = $derived.by((): { key: FilterKey; label: string }[] => {
		const items: { key: FilterKey; label: string }[] = [
			{ key: 'ranked', label: l.ranked },
			{ key: 'pro', label: l.proGames },
			{ key: 'players', label: l.players },
			{ key: 'maps', label: l.maps },
			{ key: 'races', label: l.faction },
			{ key: 'matchups', label: l.gameMode },
			{ key: 'positions', label: l.position },
			{ key: 'elo', label: l.elo },
			{ key: 'duration', label: l.duration }
		];
		return items.filter((item) => !activeKeys.includes(item.key));
	});

	function rememberPlayers(items: SelectOption[]) {
		if (items.length === 0) return;
		playerLabels = {
			...playerLabels,
			...Object.fromEntries(items.map((item) => [item.value, item.label]))
		};
	}

	async function searchPlayers(q: string) {
		if (!onSearchPlayers) return playerOptions;
		playerOptions = await onSearchPlayers(q);
		rememberPlayers(playerOptions);
		return playerOptions;
	}

	async function searchMaps(q: string) {
		if (!q.trim()) {
			mapOptions = mapSelectOptions;
			return mapOptions;
		}
		if (onSearchMaps) {
			mapOptions = await onSearchMaps(q);
			return mapOptions;
		}
		mapOptions = mapSelectOptions.filter((item) =>
			item.label.toLowerCase().includes(q.toLowerCase())
		);
		return mapOptions;
	}

	function addFilter(key: FilterKey) {
		extra = { ...extra, [key]: true };
		if (key === 'ranked') onChange({ ranked: true });
		if (key === 'pro') onChange({ pro: true });
		if (key === 'players') playersOpen = true;
		if (key === 'maps') {
			mapOptions = mapSelectOptions;
			mapsOpen = true;
		}
		if (key === 'races') racesOpen = true;
		if (key === 'matchups') matchupsOpen = true;
		if (key === 'positions') positionsOpen = true;
		if (key === 'elo') {
			eloDraft = '1800';
			onChange({ elo: { op: 'gt', value: 1800 } });
		}
		if (key === 'duration') {
			durationDraft = '20';
			onChange({ duration: { op: 'gte', value: 20 } });
		}
	}

	function removeFilter(key: FilterKey) {
		extra = { ...extra, [key]: false };
		if (key === 'ranked') onChange({ ranked: false });
		if (key === 'pro') onChange({ pro: false });
		if (key === 'players') onChange({ playerIds: [] });
		if (key === 'maps') onChange({ maps: [] });
		if (key === 'races') onChange({ races: [] });
		if (key === 'matchups') onChange({ matchups: [] });
		if (key === 'positions') onChange({ positions: [] });
		if (key === 'elo') onChange({ elo: null });
		if (key === 'duration') onChange({ duration: null });
	}

	function selectedCount(count: number) {
		return l.selectedCount.replace('{count}', String(count));
	}

	function playersLabel() {
		if (query.playerIds.length === 0) return l.selectPlayers;
		if (query.playerIds.length === 1) return playerLabels[query.playerIds[0]] || query.playerIds[0];
		return selectedCount(query.playerIds.length);
	}

	function mapsLabel() {
		if (query.maps.length === 0) return l.selectMaps;
		if (query.maps.length === 1) {
			return mapSelectOptions.find((item) => item.value === query.maps[0])?.label ?? query.maps[0];
		}
		return selectedCount(query.maps.length);
	}

	function racesLabel() {
		if (query.races.length === 0) return l.selectFactions;
		if (query.races.length === 1) {
			return factionOptions.find((item) => item.value === query.races[0])?.label ?? query.races[0];
		}
		return selectedCount(query.races.length);
	}

	function matchupsLabel() {
		if (query.matchups.length === 0) return l.selectGameModes;
		if (query.matchups.length === 1) return query.matchups[0];
		return selectedCount(query.matchups.length);
	}

	function positionsLabel() {
		if (query.positions.length === 0) return l.selectPositions;
		if (query.positions.length === 1) return query.positions[0];
		return selectedCount(query.positions.length);
	}

	function cycleOperator(filter: CompareFilter): CompareFilter {
		const index = operators.indexOf(filter.op);
		return { ...filter, op: operators[(index + 1) % operators.length] };
	}

	function parseDraft(raw: string, fallback: number) {
		const value = Number(String(raw).replace(/[^0-9]/g, ''));
		return Number.isFinite(value) ? value : fallback;
	}

	function setEloValue(raw: string) {
		eloDraft = raw;
		clearTimeout(eloTimer);
		eloTimer = setTimeout(() => {
			if (!query.elo) return;
			onChange({ elo: { op: query.elo.op, value: parseDraft(raw, query.elo.value) } });
		}, 200);
	}

	function setDurationValue(raw: string) {
		durationDraft = raw;
		clearTimeout(durationTimer);
		durationTimer = setTimeout(() => {
			if (!query.duration) return;
			onChange({
				duration: { op: query.duration.op, value: parseDraft(raw, query.duration.value) }
			});
		}, 200);
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
	{#if ranked}
		<span class={chipClass} data-state="active">
			<span>{l.ranked}</span>
			<button type="button" class={chipRemoveClass} aria-label={l.remove} onclick={() => removeFilter('ranked')}>
				<XIcon size={12} />
			</button>
		</span>
	{/if}

	{#if pro}
		<span class={chipClass} data-state="active">
			<span>{l.proGames}</span>
			<button type="button" class={chipRemoveClass} aria-label={l.remove} onclick={() => removeFilter('pro')}>
				<XIcon size={12} />
			</button>
		</span>
	{/if}

	{#if playersOn}
		<span class={chipClass} data-state="active">
			<button type="button" class={cn(interactive, 'max-w-48 truncate')} onclick={() => (playersOpen = true)}>
				{playersLabel()}
			</button>
			<button type="button" class={chipRemoveClass} aria-label={l.remove} onclick={() => removeFilter('players')}>
				<XIcon size={12} />
			</button>
			<Selection
				bind:open={playersOpen}
				value={query.playerIds}
				options={playerOptions}
				multiple
				hideTrigger
				placeholder={l.selectPlayers}
				onSearch={searchPlayers}
				onValueChange={(next) => onChange({ playerIds: Array.isArray(next) ? next : [next] })}
			/>
		</span>
	{/if}

	{#if mapsOn}
		<span class={chipClass} data-state="active">
			<button type="button" class={cn(interactive, 'max-w-48 truncate')} onclick={() => (mapsOpen = true)}>
				{mapsLabel()}
			</button>
			<button type="button" class={chipRemoveClass} aria-label={l.remove} onclick={() => removeFilter('maps')}>
				<XIcon size={12} />
			</button>
			<Selection
				bind:open={mapsOpen}
				value={query.maps}
				options={mapOptions.length > 0 ? mapOptions : mapSelectOptions}
				multiple
				hideTrigger
				placeholder={l.selectMaps}
				onSearch={searchMaps}
				onValueChange={(next) => onChange({ maps: Array.isArray(next) ? next : [next] })}
			/>
		</span>
	{/if}

	{#if racesOn}
		<span class={chipClass} data-state="active">
			<button type="button" class={cn(interactive, 'max-w-48 truncate')} onclick={() => (racesOpen = true)}>
				{racesLabel()}
			</button>
			<button type="button" class={chipRemoveClass} aria-label={l.remove} onclick={() => removeFilter('races')}>
				<XIcon size={12} />
			</button>
			<Selection
				bind:open={racesOpen}
				value={query.races}
				options={factionOptions}
				multiple
				hideTrigger
				placeholder={l.selectFactions}
				onValueChange={(next) => onChange({ races: Array.isArray(next) ? next : [next] })}
			/>
		</span>
	{/if}

	{#if matchupsOn}
		<span class={chipClass} data-state="active">
			<button type="button" class={cn(interactive, 'max-w-48 truncate')} onclick={() => (matchupsOpen = true)}>
				{matchupsLabel()}
			</button>
			<button
				type="button"
				class={chipRemoveClass}
				aria-label={l.remove}
				onclick={() => removeFilter('matchups')}
			>
				<XIcon size={12} />
			</button>
			<Selection
				bind:open={matchupsOpen}
				value={query.matchups}
				options={matchupOptions}
				multiple
				hideTrigger
				placeholder={l.selectGameModes}
				onValueChange={(next) =>
					onChange({ matchups: (Array.isArray(next) ? next : [next]) as HistoryMatchup[] })}
			/>
		</span>
	{/if}

	{#if positionsOn}
		<span class={chipClass} data-state="active">
			<button
				type="button"
				class={cn(interactive, 'max-w-48 truncate')}
				onclick={() => (positionsOpen = true)}
			>
				{positionsLabel()}
			</button>
			<button
				type="button"
				class={chipRemoveClass}
				aria-label={l.remove}
				onclick={() => removeFilter('positions')}
			>
				<XIcon size={12} />
			</button>
			<Selection
				bind:open={positionsOpen}
				value={query.positions}
				options={positionOptions}
				multiple
				hideTrigger
				placeholder={l.selectPositions}
				onValueChange={(next) => onChange({ positions: Array.isArray(next) ? next : [next] })}
			/>
		</span>
	{/if}

	{#if query.elo}
		<span class={chipClass} data-state="active">
			<span>{l.elo}</span>
			<button
				type="button"
				class={chipControlClass}
				title={l.changeOperator}
				aria-label={l.changeOperator}
				onclick={() => onChange({ elo: cycleOperator(query.elo!) })}
			>
				{operatorSymbol[query.elo.op]}
			</button>
			<input
				type="text"
				inputmode="numeric"
				autocomplete="off"
				spellcheck="false"
				class={chipInputClass}
				value={eloInput}
				onfocus={() => {
					eloEditing = true;
					eloDraft = String(query.elo?.value ?? 1800);
				}}
				oninput={(event) => setEloValue(event.currentTarget.value)}
				onblur={() => (eloEditing = false)}
			/>
			<button type="button" class={chipRemoveClass} aria-label={l.remove} onclick={() => removeFilter('elo')}>
				<XIcon size={12} />
			</button>
		</span>
	{/if}

	{#if query.duration}
		<span class={chipClass} data-state="active">
			<span>{l.duration}</span>
			<button
				type="button"
				class={chipControlClass}
				title={l.changeOperator}
				aria-label={l.changeOperator}
				onclick={() => onChange({ duration: cycleOperator(query.duration!) })}
			>
				{operatorSymbol[query.duration.op]}
			</button>
			<input
				type="text"
				inputmode="numeric"
				autocomplete="off"
				spellcheck="false"
				class={chipInputClass}
				value={durationInput}
				onfocus={() => {
					durationEditing = true;
					durationDraft = String(query.duration?.value ?? 20);
				}}
				oninput={(event) => setDurationValue(event.currentTarget.value)}
				onblur={() => (durationEditing = false)}
			/>
			<span class="text-secondary-400">{l.minutes}</span>
			<button
				type="button"
				class={chipRemoveClass}
				aria-label={l.remove}
				onclick={() => removeFilter('duration')}
			>
				<XIcon size={12} />
			</button>
		</span>
	{/if}

	{#each availableKeys as item (item.key)}
		<button type="button" class={cn(tabTrigger, 'inline-flex items-center gap-1')} onclick={() => addFilter(item.key)}>
			<PlusIcon size={14} />
			{item.label}
		</button>
	{/each}
</div>
