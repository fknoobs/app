<script lang="ts">
	import type { HTMLAnchorAttributes } from 'svelte/elements';
	import { usePlayer } from '.';
	import PlayerLabels from './player-labels.svelte';
	import PlayerLikeCount from './player-like-count.svelte';
	import { cn } from '$lib/utils';
	import { isMePlayer } from '$lib/utils/player-me';
	import { mePlayerText } from '$lib/components/ui/variants';
	import { useI18n } from '$lib/i18n';

	type Props = HTMLAnchorAttributes;

	const { class: className, href, ...restProps }: Props = $props();
	const { t } = useI18n();
	const { player } = $derived(usePlayer());
	const isMe = $derived(isMePlayer(player));
</script>

<span class={cn('inline-flex min-w-0 items-center gap-1.5', className)}>
	<PlayerLikeCount steamId={player.steamId} class="shrink-0" />
	<a
		{...restProps}
		class={cn('hover:text-primary min-w-0 truncate transition-colors', isMe && mePlayerText)}
		href={href ?? `/players/${player.playerId}`}
	>
		{player.profile?.alias ?? player.name ?? t('CPU')}
	</a>
	<PlayerLabels steamId={player.steamId} class="shrink-0" />
</span>
