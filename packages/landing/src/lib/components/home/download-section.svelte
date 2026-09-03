<script lang="ts">
	import { Button } from '@company-of-heroes/ui/button';
	import { latestDownload, linuxDownload } from '$lib/site/download.svelte';
	import { SIGNPATH_APPLY_URL } from '$lib/site/urls';
	import { cn } from '$lib/utils/cn';
	import { headerCellAction, interactive } from '$lib/utils/variants';
	import DownloadSimpleIcon from 'phosphor-svelte/lib/DownloadSimpleIcon';
	import WarningCircleIcon from 'phosphor-svelte/lib/WarningCircleIcon';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();
</script>

<section id="download">
	<div class="border-secondary-800 border-b px-4 py-3">
		<h2 class="font-heading text-xl font-bold text-white">{t('Download the companion')}</h2>
		<p class="text-secondary-400 mt-1 text-sm">
			{t(
				'Optional desktop app for live lobby scouting, replay analysis, hotkeys, Twitch overlays, and fair play checks.'
			)}
		</p>
	</div>
	<div class="border-secondary-800 flex h-11 items-stretch overflow-x-auto border-b">
		<div class="border-secondary-800 flex shrink-0 items-stretch border-r">
			<Button
				href={latestDownload.url}
				download={latestDownload.fileName}
				variant="ghost"
				class={headerCellAction}
			>
				<DownloadSimpleIcon size={18} weight="duotone" />
				{t('Download for Windows')}
			</Button>
		</div>
		<div class="border-secondary-800 flex shrink-0 items-stretch border-r">
			<Button href={linuxDownload.url} download={linuxDownload.fileName} variant="ghost" class={headerCellAction}>
				<DownloadSimpleIcon size={18} weight="duotone" />
				{t('Download AppImage')}
			</Button>
		</div>
	</div>
	<p class="text-secondary-500 border-secondary-800 border-b px-4 py-3 text-sm">
		{t(
			'Linux needs WebKitGTK 4.1 at runtime (for example {package} on Debian/Ubuntu). In-game tracking, keybinds, and screenshots are Windows-only.',
			{ package: 'libwebkit2gtk-4.1-0' }
		)}
	</p>
	<div role="status" class="bg-warning/10 flex items-start gap-3 px-4 py-4">
		<WarningCircleIcon size={20} weight="duotone" class="text-warning mt-0.5 shrink-0" />
		<div class="text-sm leading-relaxed">
			<p class="text-warning mb-1 font-semibold">{t('Windows SmartScreen')}</p>
			<p class="text-secondary-400">
				{t(
					'The app is not code-signed yet, so Windows may show an “Unknown publisher” warning. Download only from the GitHub Releases links above, then choose {action}.',
					{ action: 'More info → Run anyway' }
				)}
			</p>
			<p class="text-secondary-500 mt-2">
				{t('We’re applying for Authenticode signing through')}
				<a
					href={SIGNPATH_APPLY_URL}
					target="_blank"
					rel="noopener noreferrer"
					class={cn(
						interactive,
						'text-secondary-200 underline underline-offset-2 hover:text-white'
					)}
				>
					SignPath Foundation
				</a>
				{t(
					'. From version 1.0, Company of Heroes - Companion will also be on the Microsoft Store.'
				)}
			</p>
		</div>
	</div>
</section>
