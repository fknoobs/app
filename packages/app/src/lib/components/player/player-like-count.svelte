<script lang="ts">
	import { PlayerLikeCount as SharedPlayerLikeCount } from '@company-of-heroes/ui/player';
	import {
		likeCountForSteamId,
		preloadPlayerLikeCounts
	} from '$core/pocketbase/player-vote-cache.svelte';

	type Props = {
		steamId?: string | null;
		likeCount?: number | null;
		showZero?: boolean;
		class?: string;
	};

	let { steamId, likeCount = null, showZero = false, class: className }: Props = $props();
	const resolved = $derived(likeCount ?? likeCountForSteamId(steamId));

	$effect(() => {
		if (likeCount == null && steamId) {
			preloadPlayerLikeCounts([steamId]);
		}
	});
</script>

<SharedPlayerLikeCount likeCount={resolved} {showZero} class={className} />
