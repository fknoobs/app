<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import MapImage from '$lib/components/MapImage.svelte';
	import {
		formatDurationSeconds,
		formatMatchDate,
		isProGameplayMatch,
		matchDurationSeconds,
		type CommunityMatchDetail,
		type ParsedReplay
	} from '$lib/replays';
	import {
		hasCountedReplayDownload,
		markReplayDownload,
		replayDownloadVisitorId
	} from '$lib/replay-downloads';
	import { normalizeMapName } from '$lib/player-format';
	import { API_URL } from '$lib/urls';
	import { cn } from '$lib/cn';
	import { interactive } from '$lib/variants';
	import ArrowLeftIcon from 'phosphor-svelte/lib/ArrowLeftIcon';
	import DownloadIcon from 'phosphor-svelte/lib/DownloadIcon';
	import RankingIcon from 'phosphor-svelte/lib/RankingIcon';

	type Props = {
		match: CommunityMatchDetail;
		replay: ParsedReplay | null;
	};

	let { match, replay }: Props = $props();
	let extraDownloads = $state(0);
	let counting = $state(false);
	let countedHere = $state(false);
	let downloadCount = $derived((match.downloadCount ?? 0) + extraDownloads);

	const mapName = $derived(
		replay?.mapFileName
			? normalizeMapName(replay.mapFileName.split(/[/\\]/).pop() ?? match.map)
			: normalizeMapName(match.map)
	);
	const duration = $derived(
		formatDurationSeconds(replay?.duration ?? matchDurationSeconds(match))
	);
	const isRanked = $derived(replay ? replay.matchType === 'automatch' : match.isRanked);
	const downloadHref = $derived(`/api/replay-file/${match.id}`);

	onMount(() => {
		countedHere = hasCountedReplayDownload(match.id);
	});

	async function recordDownload() {
		if (countedHere || counting) return;
		counting = true;
		extraDownloads += 1;
		try {
			const response = await fetch(`${API_URL}/api/match/${match.id}/download`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Download-Visitor': replayDownloadVisitorId()
				}
			});
			if (!response.ok) {
				extraDownloads -= 1;
				return;
			}
			const data = (await response.json()) as { counted?: boolean };
			countedHere = true;
			markReplayDownload(match.id);
			if (!data.counted) extraDownloads -= 1;
		} catch {
			extraDownloads -= 1;
		} finally {
			counting = false;
		}
	}
</script>

<div class="border-secondary-800 border-b">
	<div class="border-secondary-800 flex items-center gap-3 border-b px-4 py-3">
		<a
			href="/replays"
			aria-label="Back to replays"
			class={cn(
				interactive,
				'border-secondary-800 bg-secondary-800/30 hover:border-secondary-500 hover:bg-secondary-800/80 inline-flex size-9 shrink-0 items-center justify-center rounded-md border text-white'
			)}
		>
			<ArrowLeftIcon class="size-4" weight="duotone" />
		</a>
		<nav aria-label="Breadcrumb" class="font-heading min-w-0 text-sm font-bold">
			<ol class="flex items-center">
				<li>
					<a href="/replays" class={cn(interactive, 'text-secondary-400 hover:text-primary')}>
						Replays
					</a>
				</li>
				<li aria-hidden="true" class="text-secondary-500 mx-2">/</li>
				<li class="min-w-0 truncate text-white">{mapName}</li>
			</ol>
		</nav>
	</div>
	<div class="grid grid-cols-1 sm:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
		<MapImage map={match.map} alt={mapName} flush />
		<div class="min-w-0 px-6 py-4">
			<h1 class="font-heading mb-3 truncate text-3xl font-bold text-white">{mapName}</h1>
			<dl class="grid grid-cols-[minmax(7rem,auto)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
				<dt class="text-secondary-500">Replay name</dt>
				<dd class="min-w-0 truncate text-white">{replay?.replayName || match.title || '—'}</dd>
				<dt class="text-secondary-500">Date</dt>
				<dd class="text-white">{formatMatchDate(replay?.gameDate || match.createdAt)}</dd>
				<dt class="text-secondary-500">Game mode</dt>
				<dd class="flex items-center gap-2 text-white">
					{#if isRanked}
						<RankingIcon class="text-primary size-4" weight="duotone" />
						Ranked
					{:else}
						Custom game
					{/if}
					{#if isProGameplayMatch(match)}
						<span class="text-primary text-xs font-bold tracking-wide uppercase">Pro</span>
					{/if}
				</dd>
				<dt class="text-secondary-500">Duration</dt>
				<dd class="text-white">{duration}</dd>
				<dt class="text-secondary-500">Players</dt>
				<dd class="text-white">{replay?.players.length ?? match.players.length}</dd>
				{#if replay?.vpGame}
					<dt class="text-secondary-500">Victory points</dt>
					<dd class="text-white">{replay.vpCount}</dd>
				{/if}
			</dl>
			<div class="mt-4 flex flex-wrap items-center gap-3">
				<Button
					href={downloadHref}
					download={match.replay || `${match.id}.rec`}
					onclick={() => void recordDownload()}
				>
					<DownloadIcon class="size-4" />
					Download replay
				</Button>
				<span class="text-secondary-400 inline-flex items-center gap-1.5 text-sm tabular-nums">
					<DownloadIcon class="size-4" weight="duotone" />
					{downloadCount}
				</span>
			</div>
		</div>
	</div>
</div>
