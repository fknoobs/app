<script lang="ts">
	import Button from './Button.svelte';
	import { latestDownload, linuxDownload } from '$lib/download.svelte';
	import { headerCellAction } from '$lib/variants';
	import DownloadSimpleIcon from 'phosphor-svelte/lib/DownloadSimpleIcon';
	import WarningCircleIcon from 'phosphor-svelte/lib/WarningCircleIcon';
</script>

<section id="download">
	<div class="border-secondary-800 border-b px-4 py-3">
		<h2 class="font-heading text-xl font-bold text-white">Ready to play smarter?</h2>
		<p class="text-secondary-400 mt-1 text-sm">
			Download the latest build from GitHub releases. The app auto-updates with a changelog when
			new versions ship.
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
	<div class="flex items-start gap-3 px-4 py-3">
		<WarningCircleIcon size={20} weight="duotone" class="text-primary mt-0.5 shrink-0" />
		<div class="text-secondary-400 text-sm leading-relaxed">
			<p class="text-secondary-200 mb-1 font-semibold">Windows SmartScreen notice</p>
			<p>
				The app is not code-signed yet, so Windows may show an “Unknown publisher” warning. Download
				only from the official GitHub releases link above, then choose
				<strong class="text-secondary-100">More info → Run anyway</strong>.
			</p>
			<p class="text-secondary-500 mt-2">
				From version 1.0 onwards, Company of Heroes - Companion will also be available on the
				Microsoft Store.
			</p>
		</div>
	</div>
</section>
