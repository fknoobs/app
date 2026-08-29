<script lang="ts">
	import * as List from '$lib/components/ui/list';
	import * as Match from '$lib/components/match';
	import * as Replay from '$lib/components/replay';
	import MatchLobbyPlayers from '$lib/components/widgets/match-lobby-players.svelte';
	import { scale } from 'svelte/transition';
	import { page } from '$app/state';
	import { app } from '$core/app/context';
	import { Button } from '$lib/components/ui/button';
	import { SetCrumbs } from '$lib/components/ui/breadcrumb';
	import { cn, normalizeMapName } from '$lib/utils';
	import { detailMetaGrid } from '$lib/components/ui/variants';
	import { resource, watch } from 'runed';
	import { tooltip } from '$lib/attachments';
	import { bounceInOut } from 'svelte/easing';
	import dayjs from '$lib/dayjs';
	import HourglassIcon from 'phosphor-svelte/lib/HourglassIcon';
	import ChecksIcon from 'phosphor-svelte/lib/ChecksIcon';
	import DownloadIcon from 'phosphor-svelte/lib/DownloadIcon';
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';
	import { useI18n } from '$lib/i18n';
	import { tabTrigger } from '$lib/components/ui/variants';
	import { loadCheaterSteamIds } from '$core/pocketbase/anti-cheat';

	const { t } = useI18n();
	const match = resource(
		() => page.params.id,
		() => app.database.matches.getById(page.params.id!)
	);

	$inspect(match.current);

	const STATUS_POLL_MS = 10_000;
	const hasReplay = $derived(!!(match.current?.hasReplay || match.current?.replay));
	const pendingResult = $derived(!!match.current?.needsResult);

	const replayFile = resource(
		() => (hasReplay ? page.params.id : null),
		(id) => app.database.replays.getById(id!)
	);

	let isDownloading = $state(false);
	let didDownload = $derived(
		match.current && (await app.features.history.downloadExists(match.current))
	);

	const duration = $derived.by(() => {
		if (!match.current?.result?.startgametime || !match.current?.result?.completiontime) {
			return t('N/A');
		}
		const start = dayjs.unix(match.current.result.startgametime);
		const end = dayjs.unix(match.current.result.completiontime);
		const diff = dayjs.duration(end.diff(start));

		if (diff.hours() > 0) {
			return diff.format(t('H [hrs] m [mins] s [secs]'));
		}

		return diff.format(t('m [mins] s [secs]'));
	});

	const submittedBy = $derived(
		match.current?.result?.players.find((p) =>
			match.current?.user.steamIds?.includes(p.steamId || '')
		)
	);
	const downloadCount = $derived(match.current?.downloadCount ?? 0);
	const matchId = $derived(match.current?.id ?? page.params.id!);
	const sessionId = $derived(match.current?.sessionId ?? 0);
	let matchTab = $state('overview');

	const cheaterSteamIds = $derived.by(() => {
		const ids = new Set<string>();
		for (const player of match.current?.players ?? []) {
			if (player.steamId) ids.add(player.steamId);
		}
		for (const player of match.current?.result?.players ?? []) {
			if (player.steamId) ids.add(player.steamId);
			if (typeof player.name === 'string' && player.name.startsWith('/steam/')) {
				ids.add(player.name.slice('/steam/'.length));
			}
		}
		return [...ids];
	});
	const cheaters = resource(
		() => cheaterSteamIds.join(','),
		(key) => loadCheaterSteamIds(key ? key.split(',') : [])
	);

	function setLikeCount(count: number) {
		if (!match.current) return;
		match.mutate({ ...match.current, likeCount: count });
	}

	watch(
		() => [page.params.id, pendingResult] as const,
		([id, pending]) => {
			if (!id || !pending) return;

			const interval = setInterval(() => {
				void app.database.matches
					.getById(id)
					.then((updatedMatch) => match.mutate(updatedMatch))
					.catch((error) => {
						console.warn('[HISTORY]: match status poll failed:', error);
					});
			}, STATUS_POLL_MS);

			return () => clearInterval(interval);
		}
	);
</script>

<SetCrumbs items={[{ label: match.current ? normalizeMapName(match.current.map) : t('Match') }]} />

{#if match.current}
	<Match.Root match={match.current} class="border-secondary-900 overflow-clip border-b">
		<div
			class="border-secondary-800 grid grid-cols-1 border-b sm:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]"
		>
			<div class="border-secondary-800 aspect-square sm:aspect-auto sm:h-full sm:border-r">
				<Match.MapImage flush alt={normalizeMapName(match.current.map)} />
			</div>

			<div class="min-w-0 px-6 py-4">
				<div class="mb-3 flex min-w-0 items-center gap-3">
					<Match.MapName class="font-heading min-w-0 truncate text-3xl font-bold" />
					<Match.ProBadge />
				</div>

				<div class={detailMetaGrid}>
					<List.Title>{t('Status')}</List.Title>
					<List.Value class="flex items-center">
						{#if match.current.needsResult}
							<HourglassIcon class="text-primary" {@attach tooltip(t('Result pending'))} />
						{:else}
							<ChecksIcon class="text-green-400" {@attach tooltip(t('Result saved'))} />
						{/if}
					</List.Value>
					<List.Title>{t('Title')}</List.Title>
					<List.Value><Match.Title /></List.Value>

					<List.Title>{t('Submitted at')}</List.Title>
					<List.Value>{dayjs(match.current.createdAt).format('DD MMM YYYY, HH:mm')}</List.Value>
					<List.Title>{t('Player count')}</List.Title>
					<List.Value>{match.current.players?.length}</List.Value>

					{#if submittedBy}
						<List.Title>{t('Submitted by')}</List.Title>
						<List.Value>
							<a href={`/players/${submittedBy.profile_id}`} class="hover:text-primary underline">
								{submittedBy.alias}
							</a>
						</List.Value>
						<List.Title>{t('Duration')}</List.Title>
						<List.Value>{duration}</List.Value>

						<List.Title>{t('Game mode')}</List.Title>
						<List.Value>{match.current.isRanked ? t('Ranked') : t('Custom match')}</List.Value>
					{:else}
						<List.Title>{t('Game mode')}</List.Title>
						<List.Value>{match.current.isRanked ? t('Ranked') : t('Custom match')}</List.Value>
						<List.Title>{t('Duration')}</List.Title>
						<List.Value>{duration}</List.Value>
					{/if}
				</div>

				<div class="mt-4 flex flex-wrap items-center gap-2">
					{#if hasReplay}
						<Button
							onclick={() => {
								isDownloading = true;
								app.features.history
									.downloadReplay(match.current!)
									.then((result) => {
										if (result.ok) {
											didDownload = true;
											if (result.downloadCount != null && match.current) {
												match.mutate({
													...match.current,
													downloadCount: result.downloadCount
												});
											}
										} else {
											didDownload = false;
										}
									})
									.catch(() => {
										didDownload = false;
									})
									.finally(() => {
										isDownloading = false;
									});
							}}
							class={cn(didDownload && 'pointer-events-none cursor-not-allowed opacity-50')}
							loading={isDownloading}
						>
							{#if !isDownloading && !didDownload}
								<DownloadIcon class="mr-2" />
							{/if}
							{#if didDownload}
								<span in:scale={{ easing: bounceInOut, duration: 150 }}>
									<CheckIcon size={22} class="mr-2" />
								</span>
							{/if}
							{t('Download replay')}
						</Button>
					{/if}
					<Match.LikeButton
						lobbyId={matchId}
						likeCount={match.current.likeCount ?? 0}
						onCountChange={setLikeCount}
					/>
					{#if hasReplay}
						<span
							class="text-secondary-400 inline-flex h-11 items-center gap-1.5 px-2 text-sm tabular-nums"
							title={t('Downloads')}
						>
							<DownloadIcon size={16} weight="duotone" />
							{downloadCount}
						</span>
					{/if}
				</div>
			</div>
		</div>

		{#if !hasReplay}
			<div class="border-secondary-800 border-b">
				<div class="border-secondary-800 flex items-center gap-2 border-b px-4 py-2.5">
					<button
						type="button"
						class={tabTrigger}
						data-state={matchTab === 'overview' ? 'active' : undefined}
						onclick={() => (matchTab = 'overview')}
					>
						{t('Overview')}
					</button>
					<button
						type="button"
						class={tabTrigger}
						data-state={matchTab === 'screenshots' ? 'active' : undefined}
						onclick={() => (matchTab = 'screenshots')}
					>
						{t('Screenshots')}
					</button>
				</div>
				{#if matchTab === 'overview'}
					<MatchLobbyPlayers match={match.current} cheaters={cheaters.current ?? new Set()} />
					<Match.Comments lobbyId={matchId} />
				{:else}
					<Match.Screenshots
						{sessionId}
						lobbyId={matchId}
						players={match.current.players ?? []}
						resultPlayers={match.current.result?.players ?? []}
						cheaters={cheaters.current ?? new Set()}
					/>
				{/if}
			</div>
		{/if}

		{#if hasReplay}
			{#if replayFile.loading}
				<Replay.TabsSkeleton flush showTitle={false} />
			{:else if replayFile.current}
				<Replay.Root file={replayFile.current}>
					<Replay.Tabs flush match={match.current}>
						{#snippet overviewExtra()}
							<Match.Comments lobbyId={matchId} />
						{/snippet}
						{#snippet screenshots()}
							<Match.Screenshots
								{sessionId}
								lobbyId={matchId}
								players={match.current?.players ?? []}
								resultPlayers={match.current?.result?.players ?? []}
								cheaters={cheaters.current ?? new Set()}
							/>
						{/snippet}
					</Replay.Tabs>
				</Replay.Root>
			{:else if replayFile.error}
				<p class="text-secondary-400 px-4 py-3 text-sm">
					{t('Failed to load replay data.')}
				</p>
				<Match.Comments lobbyId={matchId} />
			{/if}
		{/if}
	</Match.Root>
{/if}
