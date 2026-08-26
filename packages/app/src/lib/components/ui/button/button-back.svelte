<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { goto } from '$app/navigation';
	import { cn } from '$lib/utils';
	import { interactive } from '$lib/components/ui/variants';
	import ArrowLeft from 'phosphor-svelte/lib/ArrowLeftIcon';
	import { useI18n } from '$lib/i18n';

	type Props = {
		href?: string;
		iconOnly?: boolean;
	} & HTMLButtonAttributes;

	let {
		href,
		iconOnly = false,
		children,
		onclick,
		class: className,
		...restProps
	}: Props = $props();
	const { t } = useI18n();

	function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		if (onclick) {
			onclick(event);
			return;
		}
		if (href) {
			goto(href);
			return;
		}
		history.back();
	}
</script>

<button
	type="button"
	onclick={handleClick}
	{...restProps}
	class={cn(
		interactive,
		iconOnly
			? 'border-secondary-800 bg-secondary-950/40 hover:bg-secondary-900/60 inline-flex size-9 shrink-0 items-center justify-center rounded-md border transition-colors'
			: 'mb-6 inline-flex items-center gap-2 text-xl transition-transform hover:-translate-x-0.5',
		className
	)}
>
	<ArrowLeft weight="duotone" class={iconOnly ? 'size-4' : undefined} />
	{#if !iconOnly}
		{#if children}
			{@render children()}
		{:else}
			{t('Back to previous page')}
		{/if}
	{/if}
</button>
