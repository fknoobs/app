<script lang="ts">
	import * as Nav from '$lib/components/ui/nav';
	import { app } from '$lib/state/app.svelte';
	import { H } from '$lib/components/ui/h';
	import { Toaster } from 'svelte-sonner';

	import '$lib/fonts/futura-pt-webfont/style.css';
	import '$lib/fonts/gotham/style.css';
	import '@fontsource/league-gothic';
	import '@fontsource/bebas-neue';

	import '../app.css';

	let { children } = $props();
</script>

<div class="flex h-screen overflow-hidden">
	<aside class="bg-secondary-800 w-74 px-4 py-6">
		<Nav.Root>
			{#each app.routes as { href, title }}
				<Nav.Link {href}>{title}</Nav.Link>
			{/each}
		</Nav.Root>
	</aside>
	<main class="flex-1 overflow-auto bg-white p-8">
		<div class="border-secondary-700 mb-6 border-b-2">
			<H level="1">{app.currentRoute?.title}</H>
		</div>
		{@render children()}
	</main>
</div>

<Toaster
	expand={true}
	toastOptions={{
		unstyled: true,
		classes: {
			toast: 'bottom-0 right-0 flex gap-2 items-center px-4 py-2 shadow',
			title: 'text-secondary-900',
			description: 'text-secondary-900',
			actionButton: 'text-secondary-900',
			cancelButton: 'text-secondary-900',
			closeButton: 'text-secondary-900',
			success: '[&_svg]:fill-black bg-primary'
		}
	}}
/>
