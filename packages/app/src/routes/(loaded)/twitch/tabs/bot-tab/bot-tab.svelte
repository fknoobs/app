<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Checkbox, Input } from '$lib/components/ui/input';
	import { twitchBot } from '$features/twitch-bot';
	import { Button } from '$lib/components/ui/button';
	import PlusIcon from 'phosphor-svelte/lib/PlusIcon';
	import TrashIcon from 'phosphor-svelte/lib/TrashIcon';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();
</script>

<Form.Root class="space-y-0">
	<div class="border-secondary-800 border-b p-4">
		<Form.Group class="mb-0">
			<Form.Label>{t('Enable bot')}</Form.Label>
			<Checkbox bind:checked={twitchBot.settings.enabled} label={t('Enabled')} />
		</Form.Group>
	</div>
	{#if twitchBot.enabled}
		<div class="border-secondary-800 border-b p-4">
			<Form.Group class="mb-0">
				<Form.Label>{t('Send player stats to chat')}</Form.Label>
				<Form.Description>
					{t('When enabled, the bot will send player stats (like rank etc.) to the Twitch chat.')}
				</Form.Description>
				<Checkbox bind:checked={twitchBot.settings.enablePlayerStats} label={t('Enabled')} />
			</Form.Group>
		</div>
		<div class="border-secondary-800 border-b p-4">
			<Form.Group class="mb-0">
				<Form.Label>{t('Custom bot messages')}</Form.Label>
				{#if twitchBot.settings.messages.length === 0}
					<p class="text-secondary-400 mb-4 text-sm">{t('No messages configured yet, create your first message!')}</p>
				{:else}
					<div class="grid grid-cols-[1fr_8rem_50px] items-center gap-2">
						<Form.Label>{t('Message')}</Form.Label>
						<Form.Label>{t('Interval (s)')}</Form.Label>
						<div></div>
					</div>
					{#each twitchBot.settings.messages as message, index (message)}
						<div class="grid grid-cols-[1fr_8rem_50px] items-center gap-2">
							<Input bind:value={message.text} placeholder={t('Enter bot message')} />
							<Input type="number" bind:value={message.interval} min="5" placeholder={t('Interval (s)')} />
							<Button
								variant="destructive"
								onclick={() => twitchBot.settings.messages.splice(index, 1)}
								class="h-full w-full justify-center p-0"
							>
								<TrashIcon />
							</Button>
						</div>
					{/each}
				{/if}
				<Button
					class="mt-2 w-fit"
					variant="secondary"
					onclick={() => twitchBot.settings.messages.push({ interval: 5, text: '' })}
				>
					<PlusIcon />
					{t('Add message')}
				</Button>
			</Form.Group>
		</div>
	{/if}
</Form.Root>
