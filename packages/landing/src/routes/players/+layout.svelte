<script lang="ts">
	import { navigating, page } from '$app/state';
	import CardForm from '$lib/components/CardForm.svelte';
	import PlayerProfileSkeleton from '$lib/components/PlayerProfileSkeleton.svelte';
	import type { Snippet } from 'svelte';

	type Props = {
		children: Snippet;
	};

	let { children }: Props = $props();

	const loadingPlayer = $derived.by(() => {
		const target = navigating.to;
		if (!target?.params?.id) return false;
		const path = target.url.pathname;
		return path.startsWith('/players/') && path !== '/players';
	});
	const isLookup = $derived(page.url.pathname === '/players' && !loadingPlayer);
	const formId = $derived(navigating.to?.params?.id ?? page.params.id ?? '');
</script>

{#if isLookup}
	{@render children()}
{:else}
	<div class="border-secondary-800 border-b">
		<CardForm initialId={formId} />
	</div>
	{#if loadingPlayer}
		<PlayerProfileSkeleton />
	{:else}
		{@render children()}
	{/if}
{/if}
