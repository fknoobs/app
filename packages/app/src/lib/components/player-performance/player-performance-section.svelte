<script lang="ts">
	import { PlayerPerformanceSection } from '@company-of-heroes/ui/player-performance';
	import type { Component, Snippet } from 'svelte';

	type Props = {
		title: string;
		summary?: string;
		icon?: Component;
		expanded?: boolean;
		children: Snippet;
	};

	let { title, summary, icon, expanded = $bindable(false), children }: Props = $props();
</script>

<PlayerPerformanceSection {title} {summary} icon={icon} bind:expanded>
	{@render children()}
</PlayerPerformanceSection>
