<script lang="ts">
	import type { MatchExpanded } from '$core/app/database/matches';
	import * as Tabs from '$lib/components/ui/tabs';
	import { cn } from '$lib/utils';
	import { interactive } from '$lib/components/ui/variants';
	import ReplayPlayers from './replay-players.svelte';
	import ReplayChat from './replay-chat.svelte';
	import ReplayActions from './replay-actions.svelte';

	type Props = {
		flush?: boolean;
		match?: MatchExpanded | null;
		class?: string;
	};

	let { flush = false, match = null, class: className }: Props = $props();
	let activeTab = $state('overview');

	function tabClass(tab: string) {
		return cn(
			interactive,
			'rounded-md px-4 py-1.5 font-bold transition-colors',
			activeTab === tab ? 'bg-primary text-secondary-950' : 'text-white hover:bg-secondary-950/50'
		);
	}
</script>

{#if flush}
	<div class={className}>
		<div class="border-secondary-800 flex items-center gap-2 border-b px-4 py-2.5">
			<button type="button" class={tabClass('overview')} onclick={() => (activeTab = 'overview')}>
				Overview
			</button>
			<button type="button" class={tabClass('chat')} onclick={() => (activeTab = 'chat')}>
				Chat
			</button>
			<button type="button" class={tabClass('timeline')} onclick={() => (activeTab = 'timeline')}>
				Timeline
			</button>
		</div>
		<div>
			{#if activeTab === 'overview'}
				<ReplayPlayers flush {match} class="p-0" />
			{:else if activeTab === 'chat'}
				<ReplayChat flush class="grow" />
			{:else}
				<ReplayActions flush class="grow" />
			{/if}
		</div>
	</div>
{:else}
	<Tabs.Root value="overview" class={className}>
		<Tabs.List>
			<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
			<Tabs.Trigger value="chat">Chat</Tabs.Trigger>
			<Tabs.Trigger value="timeline">Timeline</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Content value="overview" class="flex grow flex-col gap-4">
			<ReplayPlayers {match} />
		</Tabs.Content>
		<Tabs.Content value="chat" class="flex grow flex-col gap-4">
			<ReplayChat class="grow" />
		</Tabs.Content>
		<Tabs.Content value="timeline" class="flex grow flex-col gap-4">
			<ReplayActions />
		</Tabs.Content>
	</Tabs.Root>
{/if}
