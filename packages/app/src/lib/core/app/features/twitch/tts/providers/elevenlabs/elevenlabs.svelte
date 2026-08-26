<script lang="ts">
	import { ElevenlabsProvider } from './elevenlabs.svelte.js';
	import * as Form from '$lib/components/ui/form';
	import FadersHorizontal from 'phosphor-svelte/lib/FadersHorizontalIcon';
	import Trash from 'phosphor-svelte/lib/TrashIcon';
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

<div class="border-secondary-800 border-b p-4">
	<Form.Group class="mb-0">
		<Form.Label>{t('Elevenlabs API key')}</Form.Label>
		<Input
			placeholder={t('Enter elevenlabs API key ...')}
			name="elevenlabsApiKey"
			type="password"
			bind:value={app.settings.elevenlabsApiKey}
		/>
	</Form.Group>
</div>
<div class="border-secondary-800 border-b p-4">
	<Form.Group class="mb-0">
		<Form.Label>{t('Custom voices')}</Form.Label>
		<small class="text-secondary-400 -mt-2 mb-1 block">
			{t('Requires atleast 1 minute of audio playback of the voice for optimal result.')}
		</small>
		<div class="divide-secondary-800 divide-y border-secondary-800 border-y">
			{#each provider.customVoices as voice (voice.voiceId)}
				<span class="flex items-center justify-between py-2 ps-1 pe-2">
					<span>{voice.name}</span>
					<span>
						<Button
							variant="secondary"
							size="icon-sm"
							onclick={() => {
								dialog.open = true;
								dialog.title = t('Tune voice: {name}', { name: voice.name });
								dialog.setComponent(TuneVoice, { voiceId: voice.voiceId });
							}}
						>
							<FadersHorizontal size={18} />
						</Button>
						<Button
							variant="secondary"
							size="icon-sm"
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
							<Trash size={18} />
						</Button>
					</span>
				</span>
			{/each}
		</div>
		<Button
			variant="secondary"
			class="mt-2 w-fit"
			type="button"
			onclick={() => {
				dialog.open = true;
				dialog.title = t('Add custom voice');
				dialog.setComponent(AddVoice);
			}}
		>
			{t('Add voice')}
		</Button>
	</Form.Group>
</div>
