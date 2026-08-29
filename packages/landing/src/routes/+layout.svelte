<script lang="ts">
	import '@tt-mussels/style.css';
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { loadLatestDownload } from '$lib/download.svelte';
	import { pageShell } from '$lib/variants';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		void loadLatestDownload();
	});
</script>

<div class="bg-gray-950 min-h-screen font-sans">
	<div class={pageShell}>
		<Header />
		<div class="flex-1">
			{@render children()}
		</div>
		<Footer />
	</div>
</div>
