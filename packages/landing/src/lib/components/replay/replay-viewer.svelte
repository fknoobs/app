<script lang="ts">
	import ReplayDetailHeader from './replay-detail-header.svelte';
	import {
		Chat,
		Overview,
		Actions,
		Tabs,
		TabsSkeleton
	} from '@company-of-heroes/ui/replay';
	import type { ReplayData, ReplayPlayer, ReplayAction } from '@company-of-heroes/ui/replay';
	import type { CommunityMatchDetail, ParsedReplay, ParsedReplayPlayer } from '$lib/replays';
	import ReplayComments from './replay-comments.svelte';
	import {
		countedActions,
		doctrineBannerUrl,
		flagImageUrl,
		getCountryDisplayName,
		getRankImageByRace,
		playerCpm,
		raceFromReplayFaction,
		resolveFactionFlag,
		resolvePlayerHref
	} from '$lib/utils/resolvers';
	import {
		liveLobbyPlayerHref,
		liveLobbyPlayerLabel
	} from '$lib/utils/live-lobby';
	import { onMount } from 'svelte';
	import { useI18n } from '$lib/i18n';

	type Props = {
		match: CommunityMatchDetail;
	};

	let { match }: Props = $props();
	const { t } = useI18n();

	let tab = $state('overview');
	let replay = $state.raw<ParsedReplay | null>(null);
	let loading = $state(true);
	let errorMessage = $state('');

	const hasReplay = $derived(match.hasReplay ?? Boolean(match.replay));
	const livePlayers = $derived(match.livePlayers ?? []);
	const replayData = $derived(replay as unknown as ReplayData | null);

	function doctrineBannerForPlayer(player: ReplayPlayer) {
		return doctrineBannerUrl(player as ParsedReplayPlayer);
	}

	function countedActionsForReplay(data: ReplayData, playerId: number | null) {
		return countedActions(data as ParsedReplay, playerId ?? undefined) as ReplayAction[];
	}

	function playerCpmForReplay(data: ReplayData, playerId: number | null) {
		return playerCpm(data as ParsedReplay, playerId ?? undefined);
	}

	onMount(() => {
		if (!hasReplay) {
			loading = false;
			return;
		}

		let cancelled = false;
		async function load() {
			try {
				const [{ parseReplay }, response] = await Promise.all([
					import('@fknoobs/replay-parser'),
					fetch(`/api/replay-file/${match.id}`)
				]);
				if (!response.ok) {
					throw new Error(
						response.status === 429
							? t('Too many replay downloads from this network. Try again in a moment.')
							: t('Could not download the replay file.')
					);
				}
				const bytes = new Uint8Array(await response.arrayBuffer());
				const parsed = parseReplay(bytes) as ParsedReplay;
				if (!cancelled) replay = parsed;
			} catch (error) {
				if (!cancelled) {
					errorMessage = error instanceof Error ? error.message : t('Could not parse this replay.');
				}
			} finally {
				if (!cancelled) loading = false;
			}
		}
		void load();
		return () => {
			cancelled = true;
		};
	});
</script>

<ReplayDetailHeader {match} {replay} />

{#if !hasReplay}
	<Tabs bind:value={tab} overviewLabel={t('Overview')} showChat={false} showTimeline={false}>
		{#snippet overview()}
			<Overview
				{match}
				{livePlayers}
				playerHref={resolvePlayerHref}
				{flagImageUrl}
				{getCountryDisplayName}
				resolveFactionFlag={resolveFactionFlag}
				{raceFromReplayFaction}
				doctrineBannerUrl={doctrineBannerForPlayer}
				playerCpm={playerCpmForReplay}
				getRankImage={getRankImageByRace}
				levelLabel={t('Lv')}
				alliesLabel={t('Allies')}
				axisLabel={t('Axis')}
				unknownDoctrineLabel={t('Unknown doctrine')}
				ratingLabel={t('Rating')}
				cpmLabel={t('CPM')}
				livePlayerHref={liveLobbyPlayerHref}
				livePlayerLabel={(player) => liveLobbyPlayerLabel(player, t)}
			/>
			<ReplayComments lobbyId={match.id} />
		{/snippet}
	</Tabs>
{:else if loading}
	<TabsSkeleton
		flush
		showTitle={false}
		overviewLabel={t('Overview')}
		chatLabel={t('Chat')}
		timelineLabel={t('Timeline')}
	/>
{:else if errorMessage}
	<div class="px-4 py-3">
		<p class="text-secondary-400 text-sm">
			{errorMessage} {t('You can still download the .rec file above.')}
		</p>
	</div>
	<ReplayComments lobbyId={match.id} />
{:else if replay && replayData}
	{@const parsedReplay = replay}
	<Tabs
		bind:value={tab}
		overviewLabel={t('Overview')}
		chatLabel={t('Chat')}
		timelineLabel={t('Timeline')}
	>
		{#snippet overview()}
			<Overview
				{match}
				replay={replayData}
				{livePlayers}
				playerHref={resolvePlayerHref}
				{flagImageUrl}
				{getCountryDisplayName}
				resolveFactionFlag={resolveFactionFlag}
				{raceFromReplayFaction}
				doctrineBannerUrl={doctrineBannerForPlayer}
				playerCpm={playerCpmForReplay}
				getRankImage={getRankImageByRace}
				levelLabel={t('Lv')}
				alliesLabel={t('Allies')}
				axisLabel={t('Axis')}
				unknownDoctrineLabel={t('Unknown doctrine')}
				ratingLabel={t('Rating')}
				cpmLabel={t('CPM')}
				livePlayerHref={liveLobbyPlayerHref}
			/>
			<ReplayComments lobbyId={match.id} />
		{/snippet}
		{#snippet chat()}
			<Chat
				messages={parsedReplay.messages}
				playerCount={parsedReplay.playerCount}
				emptyMessage={t('No messages')}
			/>
		{/snippet}
		{#snippet timeline()}
			<Actions
				replay={replayData}
				countedActions={countedActionsForReplay}
				resolveFactionFlag={resolveFactionFlag}
				{raceFromReplayFaction}
			/>
		{/snippet}
	</Tabs>
{/if}
