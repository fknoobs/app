<script lang="ts">
	import { ElevenlabsProvider } from './elevenlabs.svelte.js';
	import * as Form from '$lib/components/ui/form';
	import FadersHorizontal from 'phosphor-svelte/lib/FadersHorizontalIcon';
	import Trash from 'phosphor-svelte/lib/TrashIcon';
	import PlusIcon from 'phosphor-svelte/lib/PlusIcon';
	import { app } from '$core/app/context/index.js';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { tts } from '$features/twitch';
	import { dialog } from '$lib/components/ui/dialog';
	import { AddVoice, TuneVoice } from '.';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();
	const provider = $derived(tts.provider as ElevenlabsProvider);
</script>

<Form.Group label={t('Elevenlabs API key')}>
	<Input
		placeholder={t('Enter elevenlabs API key ...')}
		name="elevenlabsApiKey"
		type="password"
		bind:value={app.settings.elevenlabsApiKey}
	/>
</Form.Group>
<Form.Group
	label={t('Custom voices')}
	description={t('Requires atleast 1 minute of audio playback of the voice for optimal result.')}
	layout="stacked"
>
	{#each provider.customVoices as voice (voice.voiceId)}
		<div class="flex min-w-0 items-center gap-3">
			<span class="min-w-0 flex-1 truncate">{voice.name}</span>
			<Button
				variant="secondary"
				size="icon-sm"
				type="button"
				onclick={() => {
					dialog.open = true;
					dialog.title = t('Tune voice: {name}', { name: voice.name });
					dialog.setComponent(TuneVoice, { voiceId: voice.voiceId });
				}}
			>
				<FadersHorizontal size={16} />
			</Button>
			<Button
				variant="secondary"
				size="icon-sm"
				type="button"
				onclick={() => {
					voice.isDeleting = true;
					provider
						.deleteVoice(voice.voiceId)
						.then(() => provider.getVoices())
						.finally(() => {
							voice.isDeleting = false;
						});
				}}
				loading={voice.isDeleting}
			>
				<Trash size={16} />
			</Button>
		</div>
	{/each}
	{#snippet footer()}
		<Button
			variant="secondary"
			class="w-fit"
			type="button"
			onclick={() => {
				dialog.open = true;
				dialog.title = t('Add custom voice');
				dialog.setComponent(AddVoice);
			}}
		>
			<PlusIcon size={16} />
			{t('Add voice')}
		</Button>
	{/snippet}
</Form.Group>
