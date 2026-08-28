<script lang="ts">
	import { useMatch } from '.';
	import { tooltip } from '$lib/attachments';
	import { getEloColor, getEloTextShadow } from '$lib/components/leaderboard/leaderboard-utils';
	import { getMatchAverageElo, isProGameplayMatch } from '$lib/utils/match-elo';
	import CrownIcon from 'phosphor-svelte/lib/CrownIcon';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();
	const match = useMatch();
	const average = $derived(getMatchAverageElo(match));
	const isPro = $derived(isProGameplayMatch(match));
	const displayElo = $derived(average != null ? Math.max(average, 1950) : undefined);
	const color = $derived(displayElo != null ? getEloColor(displayElo) : undefined);
	const glow = $derived(getEloTextShadow(displayElo));
	const rounded = $derived(average != null ? Math.round(average) : 0);
</script>

{#if isPro && average != null}
	<span
		class="inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase"
		style:color
		style:border-color={color}
		style:background-color="color-mix(in oklch, {color} 12%, transparent)"
		style:text-shadow={glow}
		{@attach tooltip(t('Pro gameplay · avg {elo} ELO', { elo: rounded }))}
	>
		<CrownIcon class="size-3 shrink-0" weight="duotone" />
		{t('Pro')}
	</span>
{/if}
