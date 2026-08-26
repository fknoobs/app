<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Button } from '$lib/components/ui/button';
	import TrashIcon from 'phosphor-svelte/lib/TrashIcon';
	import UserSoundIcon from 'phosphor-svelte/lib/UserSoundIcon';
	import { Checkbox, Input, RadioGroup, Selection } from '$lib/components/ui/input';
	import { tts } from '$features/twitch';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();
</script>

<Form.Root class="space-y-0">
	<div class="border-secondary-800 border-b p-4">
		<Form.Group class="mb-0">
			<Form.Label>{t('Enable TTS')}</Form.Label>
			<Checkbox bind:checked={tts.settings.enabled} label={t('Enabled')} />
		</Form.Group>
	</div>
	<div class="border-secondary-800 border-b p-4">
		<Form.Group class="mb-0">
			<Form.Label>{t('TTS Provider')}</Form.Label>
			<div class="flex items-center gap-8">
				<RadioGroup
					name="provider"
					items={tts.providers.map((provider) => ({
						value: provider.name,
						label: provider.name
					}))}
					direction="horizontal"
					bind:value={tts.settings.provider}
				/>
			</div>
		</Form.Group>
	</div>
	<div class="border-secondary-800 border-b p-4">
		<Form.Group class="mb-0">
			<Form.Label>{t('Announce user')}</Form.Label>
			<small class="text-secondary-400 -mt-2 mb-1 block">
				{t('When enabled, TTS will announce the username of the message sender before reading the message.')}
				<pre>{`{username} says: {message}`}</pre>
			</small>
			<RadioGroup
				name="provider"
				items={[
					{
						value: 'always',
						label: t('Always')
					},
					{
						value: 'onlyOnce',
						label: t('Only once')
					}
				]}
				direction="horizontal"
				bind:value={tts.settings.announceUser}
			/>
		</Form.Group>
	</div>
	<div class="border-secondary-800 border-b p-4">
		<Form.Group class="mb-0">
			<Form.Label>{t('TTS message format')}</Form.Label>
			<small class="text-secondary-400 -mt-2 mb-1 block">
				{t('Available variables:')} <code>{`{username}`}</code>
				<code>{`{message}`}</code>
			</small>
			<Input
				placeholder={`{username} said, {message}`}
				name="ttsMessageFormat"
				type="text"
				bind:value={tts.settings.messageFormat}
			/>
		</Form.Group>
	</div>
	<div class="border-secondary-800 border-b p-4">
		<Form.Group class="mb-0">
			<Form.Label>{t('Aliases')}</Form.Label>
			<small class="text-secondary-400 -mt-2 mb-1 block">
				{t('Define username → spoken alias mappings. When TTS reads a message it will replace the Twitch username with the alias (e.g. `sarah123 → Sarah`). Use aliases to correct pronunciations or show full/display names.')}
			</small>
			<div class="flex flex-col gap-2">
				{#each tts.settings.aliases as alias, index (alias)}
					<div class="flex w-fit gap-2">
						<Input placeholder={t('Username')} type="text" bind:value={alias.username} class="flex-1" />
						<Input placeholder={t('Spoken alias')} type="text" bind:value={alias.alias} class="flex-1" />
						<Button
							variant="destructive"
							class="w-fit px-3 text-white"
							type="button"
							onclick={() => {
								tts.settings.aliases.splice(index, 1);
							}}
						>
							<TrashIcon />
						</Button>
					</div>
				{/each}
			</div>
			<Button
				variant="secondary"
				class="mt-2 w-fit"
				type="button"
				onclick={() => {
					tts.settings.aliases.push({ username: '', alias: '' });
				}}
			>
				{t('Add alias')}
			</Button>
		</Form.Group>
	</div>
	<div class="border-secondary-800 border-b p-4">
		<Form.Group class="mb-0">
			<Form.Label>{t('Voice character')}</Form.Label>
			<Selection
				bind:value={tts.settings.voiceId}
				options={tts.provider.voices?.map((voice) => {
					return {
						value: voice.voiceId,
						label: voice.name!,
						disabled: false
					};
				})}
				placeholder={t('Select voice')}
				name="voiceName"
			>
				{#snippet icon()}
					<UserSoundIcon />
				{/snippet}
			</Selection>
		</Form.Group>
	</div>

	<!-- Provider specific settings -->
	<svelte:component this={tts.provider.component} />

	<!-- Render additional components registered to the TTS plugin -->
	{#each tts.components as { component, props }}
		<svelte:component this={component} {...props} />
	{/each}
</Form.Root>
