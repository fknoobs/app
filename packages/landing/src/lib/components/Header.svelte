<script lang="ts">
	import { page } from '$app/state';
	import logo from '@assets/logo-transparent-bg.png';
	import Button from '$lib/components/Button.svelte';
	import DiscordMenu from '$lib/components/DiscordMenu.svelte';
	import { cn } from '$lib/cn';
	import { latestDownload } from '$lib/download.svelte';
	import { interactive, headerCellAction } from '$lib/variants';

	const navLinks = [
		{ href: '/#fair-play', label: 'Fair play' },
		{ href: '/#features', label: 'Features' },
		{ href: '/#download', label: 'Download' },
		{ href: '/leaderboards', label: 'Leaderboards' },
		{ href: '/replays', label: 'Replays' },
		{ href: '/players', label: 'Players' }
	];

	function isActive(href: string) {
		if (href === '/players') return page.url.pathname.startsWith('/players');
		if (href === '/leaderboards') return page.url.pathname.startsWith('/leaderboards');
		if (href === '/replays') return page.url.pathname.startsWith('/replays');
		if (href.startsWith('/#')) {
			return page.url.pathname === '/' && page.url.hash === href.slice(1);
		}
		return false;
	}
</script>

<header
	class="border-secondary-800 bg-gray-950 sticky top-0 z-50 flex h-16 items-stretch border-b"
>
	<a href="/" class={cn(interactive, 'flex min-w-0 items-stretch')}>
		<span
			class="border-secondary-800 relative h-full w-16 shrink-0 overflow-clip border-r bg-black"
		>
			<img
				src={logo}
				alt="Company of Heroes Companion"
				class="absolute inset-0 size-full object-cover"
			/>
		</span>
		<div class="flex min-w-0 flex-col justify-center px-4">
			<p class="truncate font-medium text-white">Company of Heroes</p>
			<p class="text-primary truncate text-xs font-medium">Companion</p>
		</div>
	</a>

	<nav class="ms-auto hidden items-center gap-6 px-4 md:flex">
		{#each navLinks as link (link.href)}
			<a
				href={link.href}
				class={cn(
					interactive,
					'text-sm font-medium transition-colors',
					isActive(link.href) ? 'text-primary' : 'hover:text-secondary-400 text-white'
				)}
			>
				{link.label}
			</a>
		{/each}
		<DiscordMenu
			class="hover:text-secondary-400 text-sm font-medium text-white transition-colors"
		>
			Discord
		</DiscordMenu>
	</nav>

	<div class="border-secondary-800 flex shrink-0 items-stretch border-l">
		<Button
			href={latestDownload.url}
			download={latestDownload.fileName}
			class={cn(headerCellAction, 'hidden sm:inline-flex')}
		>
			Download for Windows
		</Button>
		<Button
			href={latestDownload.url}
			download={latestDownload.fileName}
			class={cn(headerCellAction, 'sm:hidden')}
		>
			Download
		</Button>
	</div>
</header>
