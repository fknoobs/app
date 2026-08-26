<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import ArrowRightIcon from 'phosphor-svelte/lib/ArrowRightIcon';
	import TrashIcon from 'phosphor-svelte/lib/TrashIcon';
	import UserSoundIcon from 'phosphor-svelte/lib/UserSoundIcon';
	import { Button } from '$lib/components/ui/button';
	import { dialog } from '$lib/components/ui/dialog';
	import { Checkbox, Input, Selection } from '$lib/components/ui/input';
	import { AddRewardedVoiceUserForm } from '.';
	import { tts } from '$features/twitch';
	import { ttsPersonalVoices } from '$features/tts-personal-voices';
	import SelectVoices from '$lib/components/select/select-voices.svelte';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();
	const voiceOptions = $derived(
		tts.provider.voices.map((voice) => ({
			value: voice.voiceId!,
			label: voice.name!,
			disabled: false
		})) ?? []
	);
</script>

<div class="border-secondary-800 border-b p-4">
	<Form.Group class="mb-0">
		<Form.Label>{t('Use personal voices rewards')}</Form.Label>
		<Form.Description>
			{t(
				'Enable this option to allow viewers to redeem a custom voice TTS reward using twitch channel points.'
			)}
		</Form.Description>
		<Checkbox bind:checked={ttsPersonalVoices.settings.enabled} label={t('Enabled')} />
	</Form.Group>
</div>

{#if ttsPersonalVoices.enabled}
	<div class="border-secondary-800 border-b p-4">
		<Form.Group class="mb-0">
			<Form.Label>{t('Voices')}</Form.Label>
			<Form.Description>
				{t(
					'Select the voices that viewers can choose from when redeeming the personal voice TTS reward.'
				)}
			</Form.Description>
			<Selection
				multiple
				options={voiceOptions}
				placeholder={t('Select voices...')}
				bind:value={ttsPersonalVoices.settings.providers[tts.settings.provider].voices}
			>
				{#snippet icon()}
					<UserSoundIcon />
				{/snippet}
			</Selection>
		</Form.Group>
	</div>
	<div class="border-secondary-800 border-b p-4">
		<Form.Group class="mb-0">
			<Form.Label>{t('Reward Cost')}</Form.Label>
			<Input
				type="number"
				bind:value={ttsPersonalVoices.settings.cost}
				placeholder={t('Enter reward cost in channel points')}
				class="max-w-xs"
				step="100"
				min="0"
			/>
		</Form.Group>
	</div>
	<div class="border-secondary-800 border-b p-4">
		<Form.Group class="mb-0">
			<Form.Label>{t('Rewarded Voices')}</Form.Label>
			{#if Object.keys(ttsPersonalVoices.rewardedVoices).length === 0}
				<p class="text-secondary-400 mb-2 text-sm">
					{t(
						'No rewarded voices added yet. Rewarded voices appear here automatically, or add a user below.'
					)}
				</p>
			{:else}
				<div class="divide-secondary-800 divide-y border-secondary-800 mb-2 border-y">
					{#each Object.entries(ttsPersonalVoices.rewardedVoices) as [user, voiceId] (user)}
						<div class="flex flex-wrap items-center gap-2 py-2">
							<span class="text-primary min-w-0 font-medium">{user}</span>
							<ArrowRightIcon class="text-secondary-500 shrink-0" />
							<Selection
								class="min-w-0 flex-1"
								options={voiceOptions}
								bind:value={ttsPersonalVoices.rewardedVoices[user]}
								placeholder={t('Select voice...')}
							/>
							<Button
								variant="secondary"
								size="icon-sm"
								type="button"
								onclick={() => {
									delete ttsPersonalVoices.rewardedVoices[user];
								}}
							>
								<TrashIcon />
							</Button>
						</div>
					{/each}
				</div>
			{/if}
			<Button
				variant="secondary"
				class="w-fit"
				type="button"
				onclick={() => {
					dialog.open = true;
					dialog.title = t('Add rewarded user');
					dialog.setComponent(AddRewardedVoiceUserForm);
				}}
			>
				{t('Add user')}
			</Button>
		</Form.Group>
	</div>
	<div class="border-secondary-800 border-b p-4">
		<Form.Group class="mb-0">
			<Form.Label>{t('Enable free voices')}</Form.Label>
			<Form.Description>
				{t(
					'Enable this option to allow viewers to choose a free voice TTS. This will not use channel points, but uses the !setvoice command to set the voice.'
				)}
			</Form.Description>
			<Checkbox bind:checked={ttsPersonalVoices.settings.enableFreeVoices} label={t('Enabled')} />
		</Form.Group>
	</div>
	{#if ttsPersonalVoices.settings.enableFreeVoices}
		<div class="border-secondary-800 border-b p-4">
			<Form.Group class="mb-0">
				<Form.Label>{t('Free voices')}</Form.Label>
				<Form.Description>
					{t(
						'Select the voices that viewers can choose from when redeeming the free voice TTS reward.'
					)}
				</Form.Description>
				<SelectVoices
					options={tts.provider.voices.map((voice) => {
						return { value: voice.voiceId, label: voice.name };
					})}
					bind:value={ttsPersonalVoices.settings.providers[tts.settings.provider].freeVoices}
					placeholder={t('Select voices...')}
				>
					{#snippet icon()}
						<UserSoundIcon />
					{/snippet}
				</SelectVoices>
			</Form.Group>
		</div>
		<div class="border-secondary-800 border-b p-4">
			<Form.Group class="mb-0">
				<Form.Label>{t('Rewarded free voices')}</Form.Label>
				{#if Object.keys(ttsPersonalVoices.rewardedFreeVoices).length === 0}
					<p class="text-secondary-400 mb-2 text-sm">
						{t(
							'No rewarded free voices added yet. They appear here automatically, or add a user below.'
						)}
					</p>
				{:else}
					<div class="divide-secondary-800 divide-y border-secondary-800 mb-2 border-y">
						{#each Object.entries(ttsPersonalVoices.rewardedFreeVoices) as [user, voiceId] (user)}
							<div class="flex flex-wrap items-center gap-2 py-2">
								<span class="text-primary min-w-0 font-medium">{user}</span>
								<ArrowRightIcon class="text-secondary-500 shrink-0" />
								<Selection
									class="min-w-0 flex-1"
									options={voiceOptions}
									bind:value={ttsPersonalVoices.rewardedFreeVoices[user]}
									placeholder={t('Select voice...')}
								/>
								<Button
									variant="secondary"
									size="icon-sm"
									type="button"
									onclick={() => {
										delete ttsPersonalVoices.rewardedFreeVoices[user];
									}}
								>
									<TrashIcon />
								</Button>
							</div>
						{/each}
					</div>
				{/if}
				<Button
					variant="secondary"
					class="w-fit"
					type="button"
					onclick={() => {
						dialog.open = true;
						dialog.title = t('Add rewarded free voice user');
						dialog.setComponent(AddRewardedVoiceUserForm);
					}}
				>
					{t('Add user')}
				</Button>
			</Form.Group>
		</div>
	{/if}
{/if}
