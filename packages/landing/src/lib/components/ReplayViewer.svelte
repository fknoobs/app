<script lang="ts">
	import ReplayDetailHeader from '$lib/components/ReplayDetailHeader.svelte';
	import ReplayChat from '$lib/components/ReplayChat.svelte';
	import ReplayOverview from '$lib/components/ReplayOverview.svelte';
	import ReplayTimeline from '$lib/components/ReplayTimeline.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import type { CommunityMatchDetail, ParsedReplay } from '$lib/replays';
	import { tabTrigger } from '$lib/variants';
	import { Tabs } from 'bits-ui';
	import { onMount } from 'svelte';

	type Props = {
		match: CommunityMatchDetail;
	};

	let { match }: Props = $props();

	let tab = $state('overview');
	let replay = $state.raw<ParsedReplay | null>(null);
	let loading = $state(true);
	let errorMessage = $state('');

	onMount(() => {
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
							? 'Too many replay downloads from this network. Try again in a moment.'
							: 'Could not download the replay file.'
					);
				}
				const bytes = new Uint8Array(await response.arrayBuffer());
				const parsed = parseReplay(bytes) as ParsedReplay;
				if (!cancelled) replay = parsed;
			} catch (error) {
				if (!cancelled) {
					errorMessage = error instanceof Error ? error.message : 'Could not parse this replay.';
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

{#if loading}
	<div class="border-secondary-800 border-b px-4 py-2.5">
		<div class="flex gap-2">
			<Skeleton class="h-8 w-24" />
			<Skeleton class="h-8 w-20" />
			<Skeleton class="h-8 w-24" />
		</div>
	</div>
	<div class="grid grid-cols-1 md:grid-cols-2">
		{#each [1, 2] as col (col)}
			<div class="border-secondary-800 border-b md:border-r">
				{#each [1, 2, 3, 4] as row (`${col}-${row}`)}
					<div class="border-secondary-800 flex items-center gap-3 border-b px-4 py-3.5">
						<Skeleton class="h-10 w-full" />
					</div>
				{/each}
			</div>
		{/each}
	</div>
{:else if errorMessage}
	<div class="px-4 py-3">
		<p class="text-secondary-400 text-sm">
			{errorMessage} You can still download the .rec file above.
		</p>
	</div>
{:else if replay}
	<Tabs.Root bind:value={tab}>
		<Tabs.List class="border-secondary-800 flex items-center gap-2 border-b px-4 py-2.5">
			<Tabs.Trigger value="overview" class={tabTrigger}>Overview</Tabs.Trigger>
			<Tabs.Trigger value="chat" class={tabTrigger}>Chat</Tabs.Trigger>
			<Tabs.Trigger value="timeline" class={tabTrigger}>Timeline</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Content value="overview">
			<ReplayOverview {match} {replay} />
		</Tabs.Content>
		<Tabs.Content value="chat">
			<ReplayChat {replay} />
		</Tabs.Content>
		<Tabs.Content value="timeline">
			<ReplayTimeline {replay} />
		</Tabs.Content>
	</Tabs.Root>
{/if}
