<script lang="ts">
	import type { HTMLAnchorAttributes } from 'svelte/elements';
	import { usePlayer } from '.';
	import { cn } from '$lib/utils';
	import { isMePlayer } from '$lib/utils/player-me';
	import { mePlayerText } from '$lib/components/ui/variants';

	type Props = HTMLAnchorAttributes;

	const { ...restProps }: Props = $props();
	const { player } = $derived(usePlayer());
	const isMe = $derived(isMePlayer(player));
</script>

<a
	{...restProps}
	class={cn('hover:text-primary truncate transition-colors', isMe && mePlayerText, restProps.class)}
	href="/players/{player.playerId}"
>
	{player.profile?.alias ?? 'CPU'}
</a>
