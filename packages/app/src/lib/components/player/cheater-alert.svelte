<script lang="ts">
	import { tooltip } from '$lib/attachments';
	import WarningIcon from 'phosphor-svelte/lib/WarningIcon';
	import { useI18n } from '$lib/i18n';

	type Props = {
		compact?: boolean;
	};

	let { compact = false }: Props = $props();
	const { t } = useI18n();
</script>

{#if compact}
	<span
		class="text-destructive inline-flex shrink-0 items-center gap-0.5 text-[10px] font-bold tracking-wide uppercase"
		{@attach tooltip(t('This player has been marked as a cheater.'))}
	>
		<WarningIcon class="shrink-0" size={12} weight="bold" />
		{t('Cheater')}
	</span>
{:else}
	<div
		class="text-destructive inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold"
	>
		<WarningIcon class="shrink-0" size={16} weight="bold" />
		<span>{t('Cheater')}</span>
	</div>
{/if}
