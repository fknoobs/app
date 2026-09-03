<script lang="ts">
	import { Detail as LiveLobbyDetail, teamPlayers } from '@company-of-heroes/ui/live-lobby';
	import { SITE_URL } from '$lib/site/urls';
	import {
		liveLobbyPlayerHref,
		liveLobbyPlayerLabel,
		toLiveLobby
	} from '$lib/utils/live-lobby';
	import { currentLocale, href, useI18n } from '$lib/i18n';
	import { formatRelativeIso, normalizeMapName } from '$lib/utils/player/format';
	import { resolveFactionFlag, resolveFallbackSrc, resolveMapSrc } from '$lib/utils/resolvers';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { t } = useI18n();

	const lobby = $derived(toLiveLobby(data.lobby, t));
	const mapName = $derived(normalizeMapName(lobby.map));
	const teamsValue = $derived(
		t('{allies} vs {axis}', {
			allies: teamPlayers(lobby.players, 'allies').length,
			axis: teamPlayers(lobby.players, 'axis').length
		})
	);
</script>

<svelte:head>
	<title>{mapName} | {t('Live lobby')}</title>
	<meta
		name="description"
		content={t('Matches that companion users are in right now.')}
	/>
	<meta property="og:url" content="{SITE_URL}{href(`/live/${lobby.id}`)}" />
	<meta property="og:title" content="{mapName} — {t('Live lobby')}" />
</svelte:head>

<LiveLobbyDetail
	{lobby}
	{resolveMapSrc}
	{resolveFallbackSrc}
	{resolveFactionFlag}
	playerHref={liveLobbyPlayerHref}
	playerLabel={(player) => liveLobbyPlayerLabel(player, t)}
	formatMapName={normalizeMapName}
	formatStarted={(createdAt) => formatRelativeIso(createdAt, currentLocale())}
	matchTypeLabel={t('Match type')}
	gameModeLabel={t('Game mode')}
	playersLabel={t('Players')}
	startedLabel={t('Started')}
	hostLabel={t('Host')}
	teamsLabel={t('Teams')}
	alliesLabel={t('Allies')}
	axisLabel={t('Axis')}
	unknownHostLabel={t('Unknown')}
	rankedLabel={t('Ranked')}
	customLabel={t('Custom')}
	{teamsValue}
/>
