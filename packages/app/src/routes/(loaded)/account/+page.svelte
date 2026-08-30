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
	import { dev } from '$app/environment';
	import { useI18n } from '$lib/i18n';
	import { openUrl } from '@tauri-apps/plugin-opener';
	import ImageIcon from 'phosphor-svelte/lib/ImageIcon';

	const { t } = useI18n();
	const privacyUrl = 'https://coh1stats.com/privacy';

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
</script>

<div class={flushHeader}>
	<p class={flushHeaderDescription}>
		{t(
			'When you install the app, we automatically create a default account for you using a randomly generated email address and password. You can use this account right away to sign in and access your data. For better security and to be recognizable on leaderboards, we recommend creating your own account and switching to it. This makes it easier for others to identify you and helps keep your data protected.'
		)}
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
		<Input type="text" bind:value={app.features.auth.user.name} disabled={!dev} />
	</Form.Group>
	<Form.Group
		label={t('Email (Emails are private and will not be shared!)')}
		description={t(
			'This email is used to sign in to your account. It is recommended to use a valid email address so you can recover your account.'
		)}
	>
		<Input type="email" bind:value={app.account.settings.email} disabled={!dev} />
	</Form.Group>
	<Form.Group label={t('Password')}>
		<Input type="password" bind:value={app.account.settings.password} disabled={!dev} />
	</Form.Group>
</Form.Root>
