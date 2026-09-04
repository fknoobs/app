<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { app } from '$core/app/context';
	import { fetch } from '$core/http/fetch';
	import { Button } from '$lib/components/ui/button';
	import { flushHeader, flushHeaderDescription } from '$lib/components/ui/variants';
	import { open } from '@tauri-apps/plugin-dialog';
	import ImageCropper from '$lib/components/modals/image-cropper.svelte';
	import { readFile } from '@tauri-apps/plugin-fs';
	import { useI18n } from '$lib/i18n';
	import { openUrl } from '@tauri-apps/plugin-opener';
	import ImageIcon from 'phosphor-svelte/lib/ImageIcon';

	const { t } = useI18n();
	const privacyUrl = 'https://coh1stats.com/privacy';
	const siteUrl = 'https://coh1stats.com';

	let displayName = $state(app.features.auth.user.name ?? '');
	let email = $state(app.account.settings.email);
	let password = $state(app.account.settings.password);
	let saving = $state(false);
	let saveError = $state<string | null>(null);
	let saveSuccess = $state(false);

	const selectAvatar = async () => {
		const path = await open({
			filters: [
				{
					name: t('Image Files'),
					extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp']
				}
			],
			multiple: false,
			title: t('Select an avatar image')
		});
		if (!path) {
			return;
		}
		const file = await readFile(path);
		const url = URL.createObjectURL(new Blob([file], { type: 'image/*' }));
		app.modal.create({
			title: t('Crop Image'),
			component: ImageCropper,
			props: {
				image: url,
				oncrop: async (blob: Blob) => {
					return app.pocketbase
						.collection('users')
						.update(
							app.features.auth.userId,
							{
								avatar: new File([blob], app.features.auth.userId, { type: blob.type })
							},
							{ fetch }
						)
						.then(() => {
							app.features.auth.refreshUser();
						});
				}
			}
		});
		app.modal.open();
	};

	async function saveAccount() {
		saving = true;
		saveError = null;
		saveSuccess = false;
		const error = await app.account.updateLoginCredentials({
			name: displayName,
			email,
			password
		});
		saving = false;
		if (error) {
			saveError = error;
			return;
		}

		displayName = app.features.auth.user.name ?? '';
		saveSuccess = true;
	}
</script>

<div class={flushHeader}>
	<p class={flushHeaderDescription}>
		{t(
			'When you install the app, we automatically create a default account for you using a randomly generated email address and password. Set a display name, email, and password you recognize — the same credentials log you in on'
		)}
		<Button variant="link" class="h-auto px-0" type="button" onclick={() => openUrl(siteUrl)}>
			{siteUrl}
		</Button>
		{t('and in the desktop app.')}
		<Button variant="link" class="h-auto px-0" type="button" onclick={() => openUrl(privacyUrl)}>
			{t('Privacy policy')}
		</Button>
	</p>
</div>

<Form.Root>
	<Form.Group label={t('Update Account Settings')} />
	<Form.Group label={t('Avatar')}>
		{#if app.features.auth.avatarUrl}
			<img
				src={app.features.auth.avatarUrl}
				alt={t('User Avatar')}
				class="size-16 rounded-md bg-gray-800 object-cover"
			/>
		{:else}
			<div
				class="bg-secondary-950 text-secondary-400 flex size-16 items-center justify-center rounded-md text-xs"
			>
				{t('No Avatar')}
			</div>
		{/if}
		{#snippet footer()}
			<Button variant="secondary" type="button" class="w-fit" onclick={selectAvatar}>
				<ImageIcon size={16} />
				{t('Select image')}
			</Button>
		{/snippet}
	</Form.Group>
	<Form.Group label={t('Displayname')}>
		<Input type="text" bind:value={displayName} />
	</Form.Group>
	<Form.Group
		label={t('Email (Emails are private and will not be shared!)')}
		description={t(
			'This email is used to sign in to your account on the website and in the app. Use a valid email address so you can recover your account.'
		)}
	>
		<Input type="email" bind:value={email} />
	</Form.Group>
	<Form.Group label={t('Password')}>
		<Input type="password" bind:value={password} />
	</Form.Group>
	<Form.Group>
		{#snippet footer()}
			<Button type="button" loading={saving} disabled={saving} onclick={saveAccount}>
				{t('Save')}
			</Button>
			{#if saveError}
				<p class="text-destructive text-sm">{saveError}</p>
			{/if}
			{#if saveSuccess}
				<p class="text-success text-sm">{t('Account updated.')}</p>
			{/if}
		{/snippet}
	</Form.Group>
</Form.Root>
