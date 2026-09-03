<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Tabs } from 'bits-ui';
	import { tabTrigger } from '@company-of-heroes/ui/variants';

	type Props = {
		value?: string;
		overviewLabel?: string;
		chatLabel?: string;
		timelineLabel?: string;
		screenshotsLabel?: string;
		showScreenshots?: boolean;
		overview?: Snippet;
		chat?: Snippet;
		timeline?: Snippet;
		screenshots?: Snippet;
	};

	let {
		value = $bindable('overview'),
		overviewLabel = 'Overview',
		chatLabel = 'Chat',
		timelineLabel = 'Timeline',
		screenshotsLabel = 'Screenshots',
		showScreenshots = false,
		overview,
		chat,
		timeline,
		screenshots
	}: Props = $props();
</script>

<Tabs.Root bind:value>
	<Tabs.List class="border-secondary-800 flex items-center gap-2 border-b px-4 py-2.5">
		<Tabs.Trigger value="overview" class={tabTrigger}>{overviewLabel}</Tabs.Trigger>
		<Tabs.Trigger value="chat" class={tabTrigger}>{chatLabel}</Tabs.Trigger>
		<Tabs.Trigger value="timeline" class={tabTrigger}>{timelineLabel}</Tabs.Trigger>
		{#if showScreenshots}
			<Tabs.Trigger value="screenshots" class={tabTrigger}>{screenshotsLabel}</Tabs.Trigger>
		{/if}
	</Tabs.List>
	<Tabs.Content value="overview">
		{@render overview?.()}
	</Tabs.Content>
	<Tabs.Content value="chat">
		{@render chat?.()}
	</Tabs.Content>
	<Tabs.Content value="timeline">
		{@render timeline?.()}
	</Tabs.Content>
	{#if showScreenshots}
		<Tabs.Content value="screenshots">
			{@render screenshots?.()}
		</Tabs.Content>
	{/if}
</Tabs.Root>
