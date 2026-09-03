<script lang="ts">
	import { provideI18n, type AppI18n } from '$lib/i18n';
	import type { Snippet } from 'svelte';

	type Props = {
		i18n: AppI18n;
		children: Snippet;
	};

	let { i18n, children }: Props = $props();
	provideI18n(() => i18n);
</script>

{@render children()}
