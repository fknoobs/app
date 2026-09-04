<script lang="ts">
	import type { Snippet } from 'svelte';
	import {
		PlayerProfileHeader,
		type PerformanceRecentMatch,
		type PlayerPageData
	} from '@company-of-heroes/ui/player';
	import { getMapImageFromName } from '$lib/utils/game';
	import dayjs from '$lib/dayjs';
	import { useI18n } from '$lib/i18n';

	type Props = {
		player: PlayerPageData;
		afterName?: Snippet;
		afterDetails?: Snippet;
		vote?: Snippet;
		emptyTrackedLabel?: string;
	};

	let { player, afterName, afterDetails, vote, emptyTrackedLabel }: Props = $props();
	const { t } = useI18n();

	const joinedSince = $derived(
		player.timecreated ? dayjs.unix(player.timecreated).format('D MMM YYYY') : null
	);

	function flagImageUrl(country: string | null | undefined): string | null {
		if (!country) {
			return null;
		}

		return `https://flagsapi.com/${country.toUpperCase()}/shiny/64.png`;
	}

	function resolveAvatarUrl(url: string): string {
		return url;
	}

	function smurfLenderHref(lenderProfileId: number | null, lenderSteamId: string): string {
		return `/players/${lenderProfileId ?? lenderSteamId}`;
	}

	function resolveMapSrc(map: string | undefined): string | undefined {
		return getMapImageFromName(map);
	}

	function matchHref(match: PerformanceRecentMatch): string | null {
		if (!match.id) {
			return null;
		}

		return `/history/${match.id}`;
	}
</script>

<PlayerProfileHeader
	{player}
	{flagImageUrl}
	{resolveAvatarUrl}
	{smurfLenderHref}
	{resolveMapSrc}
	{matchHref}
	{afterName}
	{afterDetails}
	{vote}
	{joinedSince}
	steamIdLabel={t('Steam ID:')}
	trackedLabel={t('Tracked:')}
	joinedSinceLabel={t('Joined since:')}
	smurfLabel={t('Smurf account:')}
	recordLabel={t('Record:')}
	recentLabel={t('Recent:')}
	bestMapLabel={t('Best map:')}
	emptyTrackedLabel={emptyTrackedLabel ?? t('No community matches recorded yet.')}
	winLabel={t('Win')}
	lossLabel={t('Loss')}
/>
