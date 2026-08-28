<script lang="ts">
	import { openUrl } from '@tauri-apps/plugin-opener';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';
	import { useI18n } from '$lib/i18n';

	type Props = {
		currentVersion: string;
		latestVersion: string;
		notes?: string;
		releaseUrl?: string;
		onInstall?: () => Promise<void>;
	} & HTMLAttributes<HTMLDivElement>;

	let {
		currentVersion,
		latestVersion,
		notes,
		releaseUrl,
		onInstall,
		...restProps
	}: Props = $props();

	const { t } = useI18n();

	let loading = $state(false);
	let error = $state<string | null>(null);

	async function onRestart() {
		loading = true;
		error = null;
		try {
			await onInstall?.();
		} catch (err) {
			error = err instanceof Error ? err.message : t('Failed to install update.');
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
		{t('The app will back up your settings, install the update, and restart.')}
	</p>
	{#if notes}
		<p class="text-secondary-300 max-h-40 overflow-y-auto text-sm whitespace-pre-wrap">{notes}</p>
	{/if}

	{#if error}
		<p class="text-destructive text-sm">{error}</p>
	{/if}

	<div class="flex flex-wrap gap-2">
		<Button type="button" bind:loading onclick={onRestart}>
			{loading ? t('Installing update...') : t('Restart and install')}
		</Button>
		{#if releaseUrl}
			<Button type="button" variant="secondary" onclick={onOpenRelease} disabled={loading}>
				{t('View release notes')}
			</Button>
		{/if}
	</div>
</div>
