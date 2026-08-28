<script lang="ts">
	import type { MatchExpanded } from '$core/app/database/matches';
	import type { Snippet } from 'svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { tabTrigger } from '$lib/components/ui/variants';
	import ReplayPlayers from './replay-players.svelte';
	import ReplayChat from './replay-chat.svelte';
	import ReplayActions from './replay-actions.svelte';
	import { useI18n } from '$lib/i18n';

	type Props = {
		flush?: boolean;
		match?: MatchExpanded | null;
		class?: string;
		overviewExtra?: Snippet;
	};

	let { flush = false, match = null, class: className, overviewExtra }: Props = $props();
	const { t } = useI18n();
	let activeTab = $state('overview');
</script>

{#if flush}
	<div class={className}>
		<div class="border-secondary-800 flex items-center gap-2 border-b px-4 py-2.5">
			<button
				type="button"
				class={tabTrigger}
				data-state={activeTab === 'overview' ? 'active' : undefined}
				onclick={() => (activeTab = 'overview')}
			>
				{t('Overview')}
			</button>
			<button
				type="button"
				class={tabTrigger}
				data-state={activeTab === 'chat' ? 'active' : undefined}
				onclick={() => (activeTab = 'chat')}
			>
				{t('Chat')}
			</button>
			<button
				type="button"
				class={tabTrigger}
				data-state={activeTab === 'timeline' ? 'active' : undefined}
				onclick={() => (activeTab = 'timeline')}
			>
				{t('Timeline')}
			</button>
		</div>
		<div>
			{#if activeTab === 'overview'}
				<ReplayPlayers flush {match} class="p-0" />
				{@render overviewExtra?.()}
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
			<Tabs.Trigger value="overview">{t('Overview')}</Tabs.Trigger>
			<Tabs.Trigger value="chat">{t('Chat')}</Tabs.Trigger>
			<Tabs.Trigger value="timeline">{t('Timeline')}</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Content value="overview" class="flex grow flex-col gap-4">
			<ReplayPlayers {match} />
			{@render overviewExtra?.()}
		</Tabs.Content>
		<Tabs.Content value="chat" class="flex grow flex-col gap-4">
			<ReplayChat class="grow" />
		</Tabs.Content>
		<Tabs.Content value="timeline" class="flex grow flex-col gap-4">
			<ReplayActions />
		</Tabs.Content>
	</Tabs.Root>
{/if}
