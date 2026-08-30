<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { app } from '$core/app/context';
	import { tts } from '$features/twitch';
	import { ttsPersonalVoices } from '$features/tts-personal-voices';
	import { dialog } from '$lib/components/ui/dialog';
	import { Input, Selection } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();
	let userName = $state('');
	let voiceId = $state('');
	let voice = $derived(tts.provider.voices.find((v) => v.voiceId === voiceId));
</script>

<Form.Root
	onsubmit={(e) => {
		e.preventDefault();

		if (!userName) {
			app.toast.error(t('Enter twitch username.'));
			return;
		}

		if (!voiceId || !voice) {
			app.toast.error(t('Select a voice.'));
			return;
		}

		ttsPersonalVoices.rewardVoiceToUser(voice, userName);

		userName = '';
		voiceId = '';
		dialog.close();
	}}
>
	<Form.Group label={t('User Name')}>
		<Input type="text" bind:value={userName} placeholder={t('Enter the Twitch username')} />
	</Form.Group>
	<Form.Group label={t('Select voice')}>
		<Selection
			options={tts.provider.voices.map((voice) => {
				return {
					value: voice.voiceId!,
					label: voice.name!,
					disabled: false
				};
			}) || []}
			bind:value={voiceId}
			placeholder={t('Select voice...')}
		/>
	</Form.Group>
	<Form.Group>
		<Button variant="primary" class="w-fit" type="submit">{t('Add user')}</Button>
	</Form.Group>
</Form.Root>
