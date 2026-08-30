<script lang="ts">
	import DiscordMenu from '$lib/components/DiscordMenu.svelte';
	import { cn } from '$lib/cn';
	import { API_URL, GITHUB_URL, TWITCH_URL } from '$lib/urls';
	import { interactive } from '$lib/variants';

	const footerLink =
		'border-secondary-800 text-secondary-400 hover:bg-secondary-950/50 hover:text-white flex items-center border-l px-4 py-3 text-sm transition-colors';
</script>

<footer class="border-secondary-800 border-t">
	<div class="flex flex-wrap items-stretch">
		<p class="text-secondary-500 px-4 py-3 text-sm">
			© {new Date().getFullYear()} Code IT · Fknoobs
		</p>
		<nav class="ms-auto flex items-stretch">
			<a href="/privacy" class={cn(interactive, footerLink)}>Privacy</a>
			<a
				href={GITHUB_URL}
				target="_blank"
				rel="noopener noreferrer"
				class={cn(interactive, footerLink)}
			>
				GitHub
			</a>
			<DiscordMenu class={footerLink}>Discord</DiscordMenu>
			<a
				href={TWITCH_URL}
				target="_blank"
				rel="noopener noreferrer"
				class={cn(interactive, footerLink)}
			>
				Twitch
			</a>
			<a
				href={API_URL}
				target="_blank"
				rel="noopener noreferrer"
				class={cn(interactive, footerLink)}
			>
				API
			</a>
		</nav>
	</div>
</footer>
