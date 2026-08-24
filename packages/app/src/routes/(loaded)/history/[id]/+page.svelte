<script lang="ts">
	import * as List from '$lib/components/ui/list';
	import * as Match from '$lib/components/match';
	import * as Replay from '$lib/components/replay';
	import MatchLobbyPlayers from '$lib/components/widgets/match-lobby-players.svelte';
	import { scale } from 'svelte/transition';
	import { onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { app } from '$core/app/context';
	import { Button } from '$lib/components/ui/button';
	import { SetCrumbs } from '$lib/components/ui/breadcrumb';
	import { cn, normalizeMapName } from '$lib/utils';
	import { detailMetaGrid } from '$lib/components/ui/variants';
	import { resource } from 'runed';
	import { tooltip } from '$lib/attachments';
	import { bounceInOut } from 'svelte/easing';
	import dayjs from '$lib/dayjs';
	import HourGlass from 'phosphor-svelte/lib/HourglassIcon';
	import Checks from 'phosphor-svelte/lib/ChecksIcon';
	import Download from 'phosphor-svelte/lib/DownloadIcon';
	import Check from 'phosphor-svelte/lib/CheckIcon';

	const match = resource(
		() => page.params.id,
		() => app.database.matches.getById(page.params.id!)
	);

	const hasReplay = $derived(!!(match.current?.hasReplay || match.current?.replay));

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
			return 'N/A';
		}
		const start = dayjs.unix(match.current.result.startgametime);
		const end = dayjs.unix(match.current.result.completiontime);
		const diff = dayjs.duration(end.diff(start));

		if (diff.hours() > 0) {
			return diff.format('H [hrs] m [mins] s [secs]');
		}

		return diff.format('m [mins] s [secs]');
	});

	const submittedBy = $derived(
		match.current?.result?.players.find((p) =>
			match.current?.user.steamIds?.includes(p.steamId || '')
		)
	);

	const subscription = app.database.matches.subscribe(page.params.id!, (updatedMatch) => {
		match.mutate(updatedMatch);
	});

	onDestroy(() => {
		subscription.then((unsubscribe) => unsubscribe()).catch(() => undefined);
	});
</script>

<SetCrumbs items={[{ label: match.current ? normalizeMapName(match.current.map) : 'Match' }]} />

{#if match.current}
	<Match.Root match={match.current} class="border-secondary-900 overflow-clip border-b">
		<div class="border-secondary-800 grid grid-cols-1 gap-4 border-b p-4 sm:grid-cols-[minmax(200px,280px)_minmax(0,1fr)] sm:gap-6">
			<Match.MapImage alt={normalizeMapName(match.current.map)} />

			<div class="min-w-0 py-1">
				<Match.MapName class="font-heading mb-3 block truncate text-3xl font-bold" />

				<div class={detailMetaGrid}>
					<List.Title>Status</List.Title>
					<List.Value class="flex items-center">
						{#if match.current.needsResult}
							<HourGlass class="text-primary" {@attach tooltip('Result pending')} />
						{:else}
							<Checks class="text-green-400" {@attach tooltip('Result saved')} />
						{/if}
					</List.Value>
					<List.Title>Title</List.Title>
					<List.Value><Match.Title /></List.Value>

					<List.Title>Submitted at</List.Title>
					<List.Value>{dayjs(match.current.createdAt).format('DD MMM YYYY, HH:mm')}</List.Value>
					<List.Title>Player count</List.Title>
					<List.Value>{match.current.players?.length}</List.Value>

					{#if submittedBy}
						<List.Title>Submitted by</List.Title>
						<List.Value>
							<a
								href={`/players/${submittedBy.profile_id}`}
								class="hover:text-primary underline"
							>
								{submittedBy.alias}
							</a>
						</List.Value>
						<List.Title>Duration</List.Title>
						<List.Value>{duration}</List.Value>

						<List.Title>Game mode</List.Title>
						<List.Value>{match.current.isRanked ? 'Ranked' : 'Custom match'}</List.Value>
					{:else}
						<List.Title>Game mode</List.Title>
						<List.Value>{match.current.isRanked ? 'Ranked' : 'Custom match'}</List.Value>
						<List.Title>Duration</List.Title>
						<List.Value>{duration}</List.Value>
					{/if}
				</div>

				{#if hasReplay}
					<Button
						onclick={() => {
							isDownloading = true;
							app.features.history
								.downloadReplay(match.current!)
								.then(() => {
									isDownloading = false;
									didDownload = true;
								})
								.catch(() => {
									didDownload = false;
								})
								.finally(() => {
									isDownloading = false;
								});
						}}
						class={cn('mt-4', didDownload && 'pointer-events-none cursor-not-allowed opacity-50')}
						loading={isDownloading}
					>
						{#if !isDownloading && !didDownload}
							<Download class="mr-2" />
						{/if}
						{#if didDownload}
							<span in:scale={{ easing: bounceInOut, duration: 150 }}>
								<Check size={22} class="mr-2" />
							</span>
						{/if}
						Download replay
					</Button>
				{/if}
			</div>
		</div>

		<div class="border-secondary-800 border-b">
			<MatchLobbyPlayers match={match.current} />
		</div>

		{#if hasReplay}
			{#if replayFile.loading}
				<Replay.TabsSkeleton flush showTitle={false} />
			{:else if replayFile.current}
				<Replay.Root file={replayFile.current}>
					<Replay.Tabs flush />
				</Replay.Root>
			{:else if replayFile.error}
				<p class="text-secondary-400 px-4 py-3 text-sm">
					Failed to load replay data.
				</p>
			{/if}
		{/if}
	</Match.Root>
{/if}
