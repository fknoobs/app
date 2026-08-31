<script lang="ts">
	import Selection from '$lib/components/Selection.svelte';
	import { cn } from '$lib/cn';
	import { interactive, tabTrigger } from '$lib/variants';
	import type {
		CompareFilter,
		FilterOperator,
		HistoryMapOption,
		HistoryMatchup,
		HistoryPlayerOption,
		ReplaysQuery
	} from '$lib/replays';
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

	type Props = {
		query: ReplaysQuery;
		maps: HistoryMapOption[];
		onChange: (patch: Partial<ReplaysQuery>) => void;
	};

	let { query, maps, onChange }: Props = $props();

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
	let playerOptions = $state<{ value: string; label: string }[]>([]);
	let playerLabels = $state<Record<string, string>>({});
	let mapOptions = $state<{ value: string; label: string }[]>([]);
	let eloDraft = $state('1800');
	let durationDraft = $state('20');
	let eloEditing = $state(false);
	let durationEditing = $state(false);
	let eloTimer: ReturnType<typeof setTimeout> | undefined;
	let durationTimer: ReturnType<typeof setTimeout> | undefined;

	const eloInput = $derived(eloEditing ? eloDraft : String(query.elo?.value ?? 1800));
	const durationInput = $derived(durationEditing ? durationDraft : String(query.duration?.value ?? 20));

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
			{ key: 'ranked', label: 'Ranked' },
			{ key: 'pro', label: 'Pro games' },
			{ key: 'players', label: 'Players' },
			{ key: 'maps', label: 'Maps' },
			{ key: 'races', label: 'Faction' },
			{ key: 'matchups', label: 'Game mode' },
			{ key: 'positions', label: 'Position' },
			{ key: 'elo', label: 'ELO' },
			{ key: 'duration', label: 'Duration' }
		];
		return items.filter((item) => !activeKeys.includes(item.key));
	});

	function rememberPlayers(items: { value: string; label: string }[]) {
		if (items.length === 0) return;
		playerLabels = {
			...playerLabels,
			...Object.fromEntries(items.map((item) => [item.value, item.label]))
		};
	}

	async function searchPlayers(q: string) {
		const params = new URLSearchParams({ q, limit: '20' });
		const response = await fetch(`/api/history-players?${params}`);
		if (!response.ok) return playerOptions;
		const data = (await response.json()) as { items?: HistoryPlayerOption[] };
		playerOptions = (data.items ?? []).map((item) => ({
			value: String(item.profile_id),
			label: item.alias || String(item.profile_id)
		}));
		rememberPlayers(playerOptions);
		return playerOptions;
	}

	async function searchMaps(q: string) {
		if (!q.trim()) {
			mapOptions = mapSelectOptions;
			return mapOptions;
		}
		const params = new URLSearchParams({ q, limit: '40' });
		const response = await fetch(`/api/history-maps?${params}`);
		if (!response.ok) {
			mapOptions = mapSelectOptions.filter((item) =>
				item.label.toLowerCase().includes(q.toLowerCase())
			);
			return mapOptions;
		}
		const data = (await response.json()) as { items?: HistoryMapOption[] };
		mapOptions = (data.items ?? []).map((item) => ({
			value: item.map,
			label: item.name || item.map
		}));
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

	function playersLabel() {
		if (query.playerIds.length === 0) return 'Select players';
		if (query.playerIds.length === 1) return playerLabels[query.playerIds[0]] || query.playerIds[0];
		return `${query.playerIds.length} selected`;
	}

	function mapsLabel() {
		if (query.maps.length === 0) return 'Select maps';
		if (query.maps.length === 1) {
			return mapSelectOptions.find((item) => item.value === query.maps[0])?.label ?? query.maps[0];
		}
		return `${query.maps.length} selected`;
	}

	function racesLabel() {
		if (query.races.length === 0) return 'Select factions';
		if (query.races.length === 1) {
			return factionOptions.find((item) => item.value === query.races[0])?.label ?? query.races[0];
		}
		return `${query.races.length} selected`;
	}

	function matchupsLabel() {
		if (query.matchups.length === 0) return 'Select game modes';
		if (query.matchups.length === 1) return query.matchups[0];
		return `${query.matchups.length} selected`;
	}

	function positionsLabel() {
		if (query.positions.length === 0) return 'Select positions';
		if (query.positions.length === 1) return query.positions[0];
		return `${query.positions.length} selected`;
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
			onChange({ duration: { op: query.duration.op, value: parseDraft(raw, query.duration.value) } });
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
			<span>Ranked</span>
			<button type="button" class={chipRemoveClass} aria-label="Remove" onclick={() => removeFilter('ranked')}>
				<XIcon size={12} />
			</button>
		</span>
	{/if}

	{#if pro}
		<span class={chipClass} data-state="active">
			<span>Pro games</span>
			<button type="button" class={chipRemoveClass} aria-label="Remove" onclick={() => removeFilter('pro')}>
				<XIcon size={12} />
			</button>
		</span>
	{/if}

	{#if playersOn}
		<span class={chipClass} data-state="active">
			<button type="button" class={cn(interactive, 'max-w-48 truncate')} onclick={() => (playersOpen = true)}>
				{playersLabel()}
			</button>
			<button type="button" class={chipRemoveClass} aria-label="Remove" onclick={() => removeFilter('players')}>
				<XIcon size={12} />
			</button>
			<Selection
				bind:open={playersOpen}
				value={query.playerIds}
				options={playerOptions}
				multiple
				hideTrigger
				placeholder="Select players"
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
			<button type="button" class={chipRemoveClass} aria-label="Remove" onclick={() => removeFilter('maps')}>
				<XIcon size={12} />
			</button>
			<Selection
				bind:open={mapsOpen}
				value={query.maps}
				options={mapOptions.length > 0 ? mapOptions : mapSelectOptions}
				multiple
				hideTrigger
				placeholder="Select maps"
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
			<button type="button" class={chipRemoveClass} aria-label="Remove" onclick={() => removeFilter('races')}>
				<XIcon size={12} />
			</button>
			<Selection
				bind:open={racesOpen}
				value={query.races}
				options={factionOptions}
				multiple
				hideTrigger
				placeholder="Select factions"
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
				aria-label="Remove"
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
				placeholder="Select game modes"
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
				aria-label="Remove"
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
				placeholder="Select positions"
				onValueChange={(next) => onChange({ positions: Array.isArray(next) ? next : [next] })}
			/>
		</span>
	{/if}

	{#if query.elo}
		<span class={chipClass} data-state="active">
			<span>ELO</span>
			<button
				type="button"
				class={chipControlClass}
				title="Change operator"
				aria-label="Change operator"
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
			<button type="button" class={chipRemoveClass} aria-label="Remove" onclick={() => removeFilter('elo')}>
				<XIcon size={12} />
			</button>
		</span>
	{/if}

	{#if query.duration}
		<span class={chipClass} data-state="active">
			<span>Duration</span>
			<button
				type="button"
				class={chipControlClass}
				title="Change operator"
				aria-label="Change operator"
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
			<span class="text-secondary-400">min</span>
			<button
				type="button"
				class={chipRemoveClass}
				aria-label="Remove"
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
