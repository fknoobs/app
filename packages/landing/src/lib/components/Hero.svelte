<script lang="ts">
	import dashboardImg from '@assets/screens/dashboard.png';
	import Button from './Button.svelte';
	import DiscordMenu from './DiscordMenu.svelte';
	import { latestDownload } from '$lib/download.svelte';
	import { cn } from '$lib/cn';
	import DownloadSimpleIcon from 'phosphor-svelte/lib/DownloadSimpleIcon';
	import DiscordLogoIcon from 'phosphor-svelte/lib/DiscordLogoIcon';
</script>

<section class="border-secondary-800 border-b">
	<div class="grid lg:grid-cols-2">
		<div class="flex min-w-0 flex-col">
			<div class="flex grow flex-col justify-center px-6 py-6">
				<p class="text-primary mb-2 text-xs font-medium">Free desktop app</p>
				<h1 class="font-heading text-3xl font-bold text-white sm:text-4xl">
					Desktop companion for Company of Heroes 1
				</h1>
				<p class="text-secondary-400 mt-3 max-w-xl text-sm leading-relaxed">
					Replay analysis, live lobby scouting, match history, Relic leaderboards, faction
					keybindings, and Twitch overlays — plus fair play checks that help keep the community
					clean of cheaters.
				</p>
				<p class="text-secondary-500 mt-4 text-sm">Windows and Linux · Free · Auto-updates</p>
				<div class="mt-5 flex flex-wrap gap-3">
					<Button href={latestDownload.url} download={latestDownload.fileName}>
						<DownloadSimpleIcon size={18} weight="duotone" />
						Download free
					</Button>
					<DiscordMenu
						class={cn(
							'inline-flex h-11 items-center justify-center gap-2 rounded-md border px-6 text-base transition-colors duration-150',
							'border-secondary-800 bg-secondary-800/30 text-white hover:border-secondary-500 hover:bg-secondary-800/80'
						)}
					>
						<DiscordLogoIcon size={18} weight="duotone" />
						Join Discord
					</DiscordMenu>
				</div>
			</div>
		</div>
		<div
			class="border-secondary-800 relative aspect-[16/10] overflow-clip border-t lg:aspect-auto lg:min-h-80 lg:border-t-0 lg:border-l"
		>
			<img
				src={dashboardImg}
				alt="Companion dashboard with profile, today’s matches, and live lobbies from other users"
				class="absolute inset-0 size-full object-cover"
				width="1280"
				height="800"
				fetchpriority="high"
			/>
		</div>
	</div>
</section>
