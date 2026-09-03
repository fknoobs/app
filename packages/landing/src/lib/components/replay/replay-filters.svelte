<script lang="ts">
	import { Filters } from '@company-of-heroes/ui/replay';
	import type { HistoryMapOption, HistoryPlayerOption, ReplaysQuery } from '$lib/replays';
	import { useI18n } from '$lib/i18n';

	type Props = {
		query: ReplaysQuery;
		maps: HistoryMapOption[];
		onChange: (patch: Partial<ReplaysQuery>) => void;
	};

	let { query, maps, onChange }: Props = $props();
	const { t } = useI18n();

	const labels = $derived({
		ranked: t('Ranked'),
		proGames: t('Pro games'),
		players: t('Players'),
		maps: t('Maps'),
		faction: t('Faction'),
		gameMode: t('Game mode'),
		position: t('Position'),
		elo: t('ELO'),
		duration: t('Duration'),
		selectPlayers: t('Select players'),
		selectMaps: t('Select maps'),
		selectFactions: t('Select factions'),
		selectGameModes: t('Select game modes'),
		selectPositions: t('Select positions'),
		selectedCount: t('{count} selected'),
		remove: t('Remove'),
		changeOperator: t('Change operator'),
		minutes: t('min')
	});

	async function searchPlayers(q: string) {
		const params = new URLSearchParams({ q, limit: '20' });
		const response = await fetch(`/api/history-players?${params}`);
		if (!response.ok) return [];
		const data = (await response.json()) as { items?: HistoryPlayerOption[] };
		return (data.items ?? []).map((item) => ({
			value: String(item.profile_id),
			label: item.alias || String(item.profile_id)
		}));
	}

	async function searchMaps(q: string) {
		const params = new URLSearchParams({ q, limit: '40' });
		const response = await fetch(`/api/history-maps?${params}`);
		if (!response.ok) {
			return maps
				.map((item) => ({ value: item.map, label: item.name || item.map }))
				.filter((item) => item.label.toLowerCase().includes(q.toLowerCase()));
		}
		const data = (await response.json()) as { items?: HistoryMapOption[] };
		return (data.items ?? []).map((item) => ({
			value: item.map,
			label: item.name || item.map
		}));
	}
</script>

<Filters {query} {maps} {onChange} {labels} onSearchPlayers={searchPlayers} onSearchMaps={searchMaps} />
