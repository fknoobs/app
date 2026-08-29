<script lang="ts">
	import { twitch } from '$features/twitch';
	import { tabTrigger } from '$lib/components/ui/variants';
	import { TtsTab } from './tabs/tts-tab';
	import TwitchTab from './tabs/twitch-tab/twitch-tab.svelte';
	import { OverlaysTab } from './tabs/overlays-tab';
	import { BotTab } from './tabs/bot-tab';
	import { useI18n } from '$lib/i18n';

	let currentTab = $state('twitch');
	const { t } = useI18n();

	function selectTab(tab: string) {
		if ((tab === 'tts' || tab === 'bot') && !twitch.enabled) return;
		currentTab = tab;
	}
</script>

<div class="border-secondary-900 overflow-clip border-b">
	<div>
		<div class="flex items-center gap-2 px-4 py-2">
			<button
				type="button"
				class={tabTrigger}
				data-state={currentTab === 'twitch' ? 'active' : undefined}
				onclick={() => selectTab('twitch')}
			>
				{t('Twitch')}
			</button>
			<button
				type="button"
				class={tabTrigger}
				data-state={currentTab === 'tts' ? 'active' : undefined}
				onclick={() => selectTab('tts')}
				disabled={!twitch.enabled}
			>
				{t('TTS')}
			</button>
			<button
				type="button"
				class={tabTrigger}
				data-state={currentTab === 'bot' ? 'active' : undefined}
				onclick={() => selectTab('bot')}
				disabled={!twitch.enabled}
			>
				{t('Bot')}
			</button>
			<button
				type="button"
				class={tabTrigger}
				data-state={currentTab === 'overlays' ? 'active' : undefined}
				onclick={() => selectTab('overlays')}
			>
				{t('Overlays')}
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
