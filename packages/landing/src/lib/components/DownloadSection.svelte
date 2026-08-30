<script lang="ts">
	import Button from './Button.svelte';
	import { latestDownload, linuxDownload } from '$lib/download.svelte';
	import { SIGNPATH_APPLY_URL } from '$lib/urls';
	import { cn } from '$lib/cn';
	import { headerCellAction, interactive } from '$lib/variants';
	import DownloadSimpleIcon from 'phosphor-svelte/lib/DownloadSimpleIcon';
	import WarningCircleIcon from 'phosphor-svelte/lib/WarningCircleIcon';
</script>

<section id="download">
	<div class="border-secondary-800 border-b px-4 py-3">
		<h2 class="font-heading text-xl font-bold text-white">Download the companion</h2>
		<p class="text-secondary-400 mt-1 text-sm">
			Installers come from GitHub Releases. The app checks for updates and shows a changelog.
		</p>
	</div>
	<div class="border-secondary-800 flex h-11 items-stretch overflow-x-auto border-b">
		<div class="border-secondary-800 flex shrink-0 items-stretch border-r">
			<Button
				href={latestDownload.url}
				download={latestDownload.fileName}
				class={headerCellAction}
			>
				<DownloadSimpleIcon size={18} weight="duotone" />
				Download for Windows
			</Button>
		</div>
		<div class="border-secondary-800 flex shrink-0 items-stretch border-r">
			<Button href={linuxDownload.url} download={linuxDownload.fileName} class={headerCellAction}>
				<DownloadSimpleIcon size={18} weight="duotone" />
				Download AppImage
			</Button>
		</div>
	</div>
	<p class="text-secondary-500 border-secondary-800 border-b px-4 py-3 text-sm">
		Linux needs WebKitGTK 4.1 at runtime (for example
		<code class="text-secondary-300">libwebkit2gtk-4.1-0</code> on Debian/Ubuntu). In-game tracking,
		keybinds, and screenshots are Windows-only.
	</p>
	<div role="status" class="bg-warning/10 flex items-start gap-3 px-4 py-4">
		<WarningCircleIcon size={20} weight="duotone" class="text-warning mt-0.5 shrink-0" />
		<div class="text-sm leading-relaxed">
			<p class="text-warning mb-1 font-semibold">Windows SmartScreen</p>
			<p class="text-secondary-400">
				The app is not code-signed yet, so Windows may show an “Unknown publisher” warning. Download
				only from the GitHub Releases links above, then choose
				<strong class="text-secondary-200 font-semibold">More info → Run anyway</strong>.
			</p>
			<p class="text-secondary-500 mt-2">
				We’re applying for Authenticode signing through
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
				</a>. From version 1.0, Company of Heroes - Companion will also be on the Microsoft Store.
			</p>
		</div>
	</div>
</section>
