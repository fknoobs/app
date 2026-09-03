<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '@company-of-heroes/ui/cn';
	import {
		flushBand,
		flushFooter,
		flushHeaderDescription,
		flushHeaderTitle,
		flushSectionTitle
	} from '../../variants';

	type Layout = 'field' | 'band' | 'stacked';

	type Props = {
		label?: string;
		inputId?: string;
		description?: string | Snippet;
		hint?: Snippet;
		footer?: Snippet;
		children?: Snippet;
		layout?: Layout;
	} & HTMLAttributes<HTMLDivElement>;

	let {
		label,
		inputId,
		description,
		hint,
		footer,
		children,
		layout = 'field',
		class: className,
		...restProps
	}: Props = $props();

	const descriptionText = $derived(typeof description === 'string' ? description : undefined);
	const descriptionSnippet = $derived(typeof description === 'function' ? description : undefined);
	const hasHeader = $derived(!!label || !!description || !!hint);
	const hasBody = $derived(!!children || !!footer);
	const titleClass = $derived(hasBody ? flushHeaderTitle : flushSectionTitle);
</script>

<div {...restProps} class={cn('border-secondary-800 border-b', className)}>
	{#if hasHeader}
		<div class={hasBody ? 'px-4 pt-3' : 'px-4 py-4'}>
			{#if label || hint}
				<div class="flex items-center gap-2">
					{#if label}
						{#if inputId}
							<label for={inputId} class={titleClass}>{label}</label>
						{:else}
							<p class={titleClass}>{label}</p>
						{/if}
					{/if}
					{@render hint?.()}
				</div>
			{/if}
			{#if descriptionText || descriptionSnippet}
				<div class={flushHeaderDescription}>
					{#if descriptionText}
						{descriptionText}
					{:else}
						{@render descriptionSnippet?.()}
					{/if}
				</div>
			{/if}
		</div>
	{/if}
	{#if hasBody && layout === 'band'}
		<div class={flushBand}>
			{@render children?.()}
			{#if footer}
				<div class={flushFooter}>
					{@render footer()}
				</div>
			{/if}
		</div>
	{:else if hasBody}
		<div class={hasHeader ? 'px-4 pt-2 pb-3' : 'px-4 py-3'}>
			{#if children}
				<div
					class={layout === 'stacked'
						? 'flex max-w-xl flex-col gap-3'
						: 'flex max-w-xl flex-wrap items-center gap-3'}
				>
					{@render children()}
				</div>
			{/if}
			{#if footer}
				<div class={cn('flex flex-wrap items-center gap-2', children && 'mt-3')}>
					{@render footer()}
				</div>
			{/if}
		</div>
	{/if}
</div>
