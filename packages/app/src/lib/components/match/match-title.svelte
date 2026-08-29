<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { useMatch } from '.';
	import { cn } from '$lib/utils';
	import { tooltip } from '$lib/attachments';
	import RankingIcon from 'phosphor-svelte/lib/RankingIcon';
	import MatchProBadge from './match-pro-badge.svelte';
	import { useI18n } from '$lib/i18n';

	type Props = HTMLAttributes<HTMLSpanElement> & {
		iconsOnly?: boolean;
	};

	const { iconsOnly = false, ...restProps }: Props = $props();
	const { t } = useI18n();
	const match = useMatch();
	const title = $derived(
		match.isRanked ? match.title : match.result ? (match.result as any).description : match.title
	);
</script>

<span {...restProps} class={cn('flex items-center gap-2 font-medium', restProps.class)}>
	{#if match.isRanked}
		<span {@attach tooltip(t('Ranked match'))}>
			<RankingIcon class="text-primary-100" weight="duotone" />
		</span>
	{:else if !iconsOnly}
		<span class="truncate">{title}</span>
	{/if}
	<MatchProBadge />
</span>
