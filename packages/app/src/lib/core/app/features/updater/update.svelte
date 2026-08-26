<script lang="ts">
	import { downloadDir, join } from '@tauri-apps/api/path';
	import { openPath, openUrl } from '@tauri-apps/plugin-opener';
	import { exit } from '@tauri-apps/plugin-process';
	import { download } from '@tauri-apps/plugin-upload';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';
	import { useI18n } from '$lib/i18n';

	type Props = {
		currentVersion: string;
		latestVersion: string;
		downloadUrl?: string;
		downloadFileName?: string;
		releaseUrl?: string;
		onPrepare?: () => Promise<void>;
	} & HTMLAttributes<HTMLDivElement>;

	let {
		currentVersion,
		latestVersion,
		downloadUrl,
		downloadFileName,
		releaseUrl,
		onPrepare,
		...restProps
	}: Props = $props();

	const { t } = useI18n();

	let loading = $state(false);
	let error = $state<string | null>(null);

	async function onDownload() {
		if (!downloadUrl) return;

		loading = true;
		error = null;

		try {
			await onPrepare?.();

			const fileName =
				downloadFileName ?? `coh-companion-${latestVersion}-setup.exe`;
			const filePath = await join(await downloadDir(), fileName);

			await download(downloadUrl, filePath);
			await openPath(filePath);
			await exit(0);
		} catch (err) {
			error = err instanceof Error ? err.message : t('Failed to download update.');
			loading = false;
		}
	}

	async function onOpenRelease() {
		if (!releaseUrl) return;
		await openUrl(releaseUrl);
	}
</script>

<div {...restProps} class={cn('space-y-4', restProps.class)}>
	<p class="text-secondary-200">
		{t('New version {latestVersion} is available. You are currently on {currentVersion}.', {
			latestVersion,
			currentVersion
		})}
	</p>
	<p class="text-secondary-400 text-sm">
		{t(
			'The app will back up your settings, download the installer in the background, close itself, and launch the installer when the download finishes.'
		)}
	</p>

	{#if error}
		<p class="text-destructive text-sm">{error}</p>
	{/if}

	<div class="flex flex-wrap gap-2">
		<Button type="button" bind:loading onclick={onDownload} disabled={!downloadUrl}>
			{loading ? t('Downloading update...') : t('Download and install')}
		</Button>
		{#if releaseUrl}
			<Button type="button" variant="secondary" onclick={onOpenRelease} disabled={loading}>
				{t('View release notes')}
			</Button>
		{/if}
	</div>
</div>
