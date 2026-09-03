<script lang="ts">
	import { PlayerProfileHeader } from '@company-of-heroes/ui/player';
	import type { PlayerPageData } from '$lib/player';
	import { flagImageUrl, resolveAvatarUrl, smurfLenderHref } from '$lib/utils/resolvers';
	import { useI18n } from '$lib/i18n';

	type Props = {
		player: PlayerPageData;
	};

	let { player }: Props = $props();
	const { t } = useI18n();
</script>

<PlayerProfileHeader
	{player}
	{flagImageUrl}
	{resolveAvatarUrl}
	{smurfLenderHref}
	levelLabel={t('Level {level}', { level: player.level })}
	steamIdLabel={t('Steam ID')}
	trackedLabel={t('Tracked')}
	trackedMatchesLabel={t('{count} matches', { count: player.performance.matchCount })}
	recordLabel={t('Record')}
	recentLabel={t('Recent')}
	bestMapLabel={t('Best map')}
	emptyTrackedLabel={t('No community matches recorded yet.')}
	winLabel={t('Win')}
	lossLabel={t('Loss')}
/>
