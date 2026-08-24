<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import { twitch } from '$features/twitch';
	import { TtsTab } from './tabs/tts-tab';
	import TwitchTab from './tabs/twitch-tab/twitch-tab.svelte';
	import { OverlaysTab } from './tabs/overlays-tab';
	import { BotTab } from './tabs/bot-tab';
</script>

<div class="px-5 py-4">
	<Tabs.Root value="twitch">
		<Tabs.List>
			<Tabs.Trigger value="twitch">Twitch</Tabs.Trigger>
			<Tabs.Trigger value="tts" disabled={!twitch.enabled}>TTS</Tabs.Trigger>
			<Tabs.Trigger value="bot" disabled={!twitch.enabled}>Bot</Tabs.Trigger>
			<Tabs.Trigger value="overlays">Overlays</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Content value="twitch">
			<TwitchTab />
		</Tabs.Content>
		<Tabs.Content value="tts">
			<TtsTab />
		</Tabs.Content>
		<Tabs.Content value="bot">
			<BotTab />
		</Tabs.Content>
		<Tabs.Content value="overlays">
			<OverlaysTab />
		</Tabs.Content>
	</Tabs.Root>
</div>
