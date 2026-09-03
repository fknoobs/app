<script lang="ts">
	import { PlayerMatchHistory } from '@company-of-heroes/ui/player';
	import type { PlayerPageData } from '$lib/player';
	import { currentLocale, href, useI18n } from '$lib/i18n';
	import { normalizeMapName } from '$lib/utils/player/format';
	import { flagImageUrl, resolveFactionFlag, resolveMapSrc } from '$lib/utils/resolvers';

	type Props = {
		player: PlayerPageData;
	};

	let { player }: Props = $props();
	const { t } = useI18n();

	function playerHref(steamId: string): string {
		return href(`/players/${steamId}`);
	}
</script>

<PlayerMatchHistory
	{player}
	{flagImageUrl}
	{playerHref}
	resolveFactionFlag={resolveFactionFlag}
	resolveMapSrc={resolveMapSrc}
	formatMapName={normalizeMapName}
	locale={currentLocale()}
	emptyMessage={t('No recent Relic matches found.')}
	changeLabel={t('Change')}
	teamLabel={t('Team')}
	eloLabel={t('ELO')}
	playerLabel={t('Player')}
	winsLabel={t('Wins')}
	lossesLabel={t('Losses')}
	streakLabel={t('Streak')}
/>
