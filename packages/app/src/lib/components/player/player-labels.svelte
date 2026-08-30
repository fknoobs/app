<script lang="ts">
	import UserLabels from '$lib/components/user/user-labels.svelte';
	import { labelsForSteamId, preloadPlayerLabels } from '$core/pocketbase/player-label-cache.svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = {
		steamId?: string | null;
	} & HTMLAttributes<HTMLSpanElement>;

	let { steamId, ...restProps }: Props = $props();
	const labels = $derived(labelsForSteamId(steamId));

	$effect(() => {
		if (steamId) preloadPlayerLabels([steamId]);
	});
</script>

<UserLabels {labels} {...restProps} />
