<script lang="ts">
	import { cn } from '$lib/utils';
	import { twitch } from '$features/twitch';
	import { interactive } from '$lib/components/ui/variants';
	import { TtsTab } from './tabs/tts-tab';
	import TwitchTab from './tabs/twitch-tab/twitch-tab.svelte';
	import { OverlaysTab } from './tabs/overlays-tab';
	import { BotTab } from './tabs/bot-tab';

	let currentTab = $state('twitch');

	function tabClass(tab: string) {
		const disabled = (tab === 'tts' || tab === 'bot') && !twitch.enabled;

		return cn(
			interactive,
			'rounded-md px-4 py-1.5 font-bold transition-colors',
			disabled && 'text-secondary-500 cursor-not-allowed',
			!disabled &&
				(currentTab === tab
					? 'bg-primary text-secondary-950'
					: 'text-white hover:bg-secondary-950/50')
		);
	}

	function selectTab(tab: string) {
		if ((tab === 'tts' || tab === 'bot') && !twitch.enabled) return;
		currentTab = tab;
	}
</script>

<div class="border-secondary-900 overflow-clip border-b">
	<div class="border-secondary-800 border-b">
		<div class="flex items-center gap-2 px-4 py-2">
			<button type="button" class={tabClass('twitch')} onclick={() => selectTab('twitch')}>
				Twitch
			</button>
			<button type="button" class={tabClass('tts')} onclick={() => selectTab('tts')} disabled={!twitch.enabled}>
				TTS
			</button>
			<button type="button" class={tabClass('bot')} onclick={() => selectTab('bot')} disabled={!twitch.enabled}>
				Bot
			</button>
			<button type="button" class={tabClass('overlays')} onclick={() => selectTab('overlays')}>
				Overlays
			</button>
		</div>

		<div class="border-secondary-800 border-t">
			{#if currentTab === 'twitch'}
				<TwitchTab />
			{:else if currentTab === 'tts'}
				<TtsTab />
			{:else if currentTab === 'bot'}
				<BotTab />
			{:else}
				<OverlaysTab />
			{/if}
		</div>
	</div>
</div>
