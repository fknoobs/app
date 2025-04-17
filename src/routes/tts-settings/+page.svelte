<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Checkbox, Input, RadioGroup } from '$lib/components/ui/input';
	import { app } from '$lib/state/app.svelte';
	import { toast } from 'svelte-sonner';
	import { start, cancel, onUrl } from '@fabianlars/tauri-plugin-oauth';
	import { openUrl } from '@tauri-apps/plugin-opener';
	import Label from '$lib/components/ui/label/label.svelte';
	import TwitchIcon from 'phosphor-svelte/lib/TwitchLogo';
	import { cn } from '$lib/utils';
	import Select from '$lib/components/ui/input/select.svelte';
	import { onMount } from 'svelte';

	let isSaving = $state(false);
	let ttsProvider = $derived(app.settings.tts.provider);

	const submit = async (e: SubmitEvent) => {
		e.preventDefault();
		isSaving = true;

		const formData = new FormData(e.target as HTMLFormElement);
		const { enabled, channel, elevenlabsApiKey, provider, voiceName } = Object.fromEntries(
			formData.entries()
		);

		app.settings.tts.enabled = enabled === 'on';
		app.settings.tts.channel = channel as string;
		app.settings.tts.elevenlabsApiKey = elevenlabsApiKey as string;
		app.settings.tts.provider = provider as 'brian' | 'elevenlabs';
		app.settings.tts.voiceName = voiceName as string;

		await app.store.set('settings', app.settings);

		setTimeout(() => {
			toast.success('settings saved');
			isSaving = false;
		}, 250);
	};

	const startOAuthFlow = async () => {
		cancel(8001);
		const port = await start({ ports: [8001, 8002, 8003, 8004, 8005] });
		const url = new URL('https://id.twitch.tv/oauth2/authorize');
		const state = Math.random().toString(36).substring(2, 15);

		console.log(`OAuth server listening on http://localhost:${port}`);

		url.searchParams.set('response_type', 'token');
		url.searchParams.set('redirect_uri', `http://localhost:${port}`);
		url.searchParams.set('scope', 'user:read:email chat:read chat:edit channel:read:redemptions');
		url.searchParams.set('client_id', app.twitch.clientId);
		url.searchParams.set('state', state);

		openUrl(url.toString());

		onUrl((u) => {
			const url = new URL(u);
			const hash = url.hash.substring(1); // remove the '#'
			const params = new URLSearchParams(hash);

			const { access_token } = Object.fromEntries(params.entries());

			if (!access_token) {
				toast.error('Failed to get access token');
				return;
			}

			toast.success('Successfully connected to Twitch');
			app.settings.tts.twitchAccessToken = access_token as string;
			app.store.set('settings', app.settings);

			cancel(port);
		});
	};

	const disconnect = () => {
		app.settings.tts.twitchAccessToken = undefined;
		app.store.set('settings', app.settings);
		toast.success('Successfully disconnected from Twitch');
	};

	const getVoices = () => app.elevenlabs.client?.voices.getAll();

	onMount(async () => {
		console.log(await getVoices());
	});
</script>

<form class="max-w-lg" onsubmit={submit}>
	<div class="mb-4 flex flex-col gap-2">
		<Label>TTS everything</Label>
		<Checkbox label="Enabled" name="enabled" checked={app.settings.tts.enabled} />
	</div>
	<div class="mb-4 flex flex-col items-start gap-2">
		<Label>Twitch Channel {app.tts.isPlaying ? 'yes' : 'no'}</Label>
		{#if app.twitch.isConnected}
			<span class="flex items-center gap-2">
				<Button variant="secondary" onclick={disconnect} type="button">Disconnect</Button>
				<span>-> {app.twitch.user?.userName}</span>
			</span>
		{:else}
			<Button variant="secondary" type="button" onclick={startOAuthFlow}>
				<TwitchIcon size="22" weight="bold" />
				Connect Twitch
			</Button>
		{/if}
		<!-- <Input
			placeholder="Enter your twitch channel ..."
			name="channel"
			value={app.settings.tts.channel}
		/> -->
	</div>
	<div class="mb-4 flex flex-col gap-2">
		<Label>TTS Provider</Label>
		<div class="flex items-center gap-8">
			<RadioGroup
				name="provider"
				items={[
					{
						value: 'brian',
						label: 'Brian'
					},
					{
						value: 'elevenlabs',
						label: 'Elevenlabs'
					}
				]}
				direction="horizontal"
				bind:value={ttsProvider}
			/>
			<!-- <Checkbox
				label="Brian"
				name="provider"
				value="brian"
				checked={app.settings.tts.provider === 'brian'}
                bind:group={app.settings.tts.provider}
			/>
			<Checkbox
				label="Elevenlabs"
				name="provider"
				value="elevenlabs"
				checked={app.settings.tts.provider === 'elevenlabs'}
			/> -->
		</div>
	</div>
	<div class={cn('mb-4 flex flex-col gap-2', ttsProvider === 'brian' && 'hidden')}>
		<Label>Elevenlabs API key</Label>
		<Input
			placeholder="Enter elevenlabs API key ..."
			name="elevenlabsApiKey"
			value={app.settings.tts.elevenlabsApiKey}
		/>
	</div>
	<div class={cn('mb-4 flex flex-col gap-2', ttsProvider === 'brian' && 'hidden')}>
		{#await getVoices() then response}
			{@const items = response?.voices.map((voice) => ({
				value: voice.name!,
				label: voice.name!,
				disabled: false
			}))}
			{#if items}
				<Label>Voice character</Label>
				<Select
					{items}
					type="single"
					placeholder="Select voice"
					name="voiceName"
					value={app.settings.tts.voiceName}
				/>
			{/if}
		{/await}
	</div>
	<div>
		<Button loading={isSaving}>Save</Button>
	</div>
</form>
