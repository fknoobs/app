<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { useMatch } from '.';
	import { cn } from '$lib/utils';
	import { tooltip } from '$lib/attachments';
	import HourGlass from 'phosphor-svelte/lib/HourglassIcon';
	import Checks from 'phosphor-svelte/lib/ChecksIcon';
	import { useI18n } from '$lib/i18n';

	type Props = HTMLAttributes<HTMLSpanElement>;

	const { ...restProps }: Props = $props();
	const { t } = useI18n();
	const match = useMatch();
</script>

<span {...restProps} class={cn('inline-flex items-center', restProps.class)}>
	{#if match.needsResult}
		<HourGlass class="text-primary" {@attach tooltip(t('Result pending'))} />
	{:else}
		<Checks class="text-green-400" {@attach tooltip(t('Result saved'))} />
	{/if}
</span>
