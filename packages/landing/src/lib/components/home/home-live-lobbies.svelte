<script lang="ts">
	import { Table as LiveLobbiesTable, type LiveLobbyPlayer } from '@company-of-heroes/ui/live-lobby';
	import type { LiveLobbyRecord } from '$lib/services/live-lobbies.service';
	import { currentLocale, useI18n } from '$lib/i18n';
	import {
		liveLobbyDetailsHref,
		liveLobbyPlayerHref,
		liveLobbyPlayerLabel,
		toLiveLobby
	} from '$lib/utils/live-lobby';
	import { formatRelativeIso, normalizeMapName } from '$lib/utils/player/format';
	import { resolveFactionFlag, resolveFallbackSrc, resolveMapSrc } from '$lib/utils/resolvers';

	type Props = {
		lobbies: LiveLobbyRecord[];
		loading?: boolean;
	};

	let { lobbies, loading = false }: Props = $props();
	const { t } = useI18n();

	const rows = $derived(lobbies.map((lobby) => toLiveLobby(lobby, t)));

	function playerLabel(player: LiveLobbyPlayer) {
		return liveLobbyPlayerLabel(player, t);
	}
</script>

<section class="border-secondary-800 border-b">
	<div
		class="border-secondary-800 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3"
	>
		<div>
			<h2 class="font-heading text-xl font-bold text-white">{t('Live lobbies')}</h2>
			<p class="text-secondary-400 mt-1 text-sm">
				{t('Matches that companion users are in right now.')}
			</p>
		</div>
		{#if !loading}
			<span class="text-secondary-400 text-sm">{t('{count} active', { count: rows.length })}</span>
		{/if}
	</div>
	<LiveLobbiesTable
		lobbies={rows}
		{loading}
		{resolveMapSrc}
		{resolveFallbackSrc}
		{resolveFactionFlag}
		playerHref={liveLobbyPlayerHref}
		{playerLabel}
		detailsHref={liveLobbyDetailsHref}
		formatMapName={normalizeMapName}
		formatStarted={(createdAt) => formatRelativeIso(createdAt, currentLocale())}
		emptyMessage={t('No community members are in a match right now.')}
		mapLabel={t('Map')}
		nameLabel={t('Name')}
		typeLabel={t('Type')}
		alliesLabel={t('Allies')}
		axisLabel={t('Axis')}
		hostLabel={t('Host')}
		startedLabel={t('Started at')}
		unknownHostLabel={t('Unknown')}
		detailsLabel={t('Details')}
	/>
</section>
