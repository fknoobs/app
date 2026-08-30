<script lang="ts">
	import { cn } from '$lib/cn';
	import { interactive } from '$lib/variants';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type Props = {
		href?: string;
		variant?: 'primary' | 'secondary';
		class?: string;
		download?: string;
		target?: HTMLAnchorAttributes['target'];
		rel?: HTMLAnchorAttributes['rel'];
		type?: HTMLButtonAttributes['type'];
		disabled?: boolean;
		onclick?: HTMLButtonAttributes['onclick'];
		children: import('svelte').Snippet;
	};

	let {
		href,
		variant = 'primary',
		class: className,
		download,
		target,
		rel,
		type = 'button',
		disabled = false,
		onclick,
		children
	}: Props = $props();

	const isExternal = $derived(Boolean(href?.startsWith('http://') || href?.startsWith('https://')));
	const linkTarget = $derived(target ?? (isExternal ? '_blank' : undefined));
	const linkRel = $derived(rel ?? (isExternal ? 'noopener noreferrer' : undefined));

	const classes = $derived(
		cn(
			interactive,
			'inline-flex items-center justify-center gap-2 border border-transparent transition-colors duration-150',
			'h-11 rounded-md px-6 text-base',
			'disabled:cursor-not-allowed disabled:opacity-60',
			variant === 'primary' &&
				'bg-primary/5 border-primary/20 hover:border-primary/80 hover:bg-primary/20 text-white',
			variant === 'secondary' &&
				'border-secondary-800 bg-secondary-800/30 hover:border-secondary-500 hover:bg-secondary-800/80 text-white',
			className
		)
	);
</script>

{#if href}
	<a {href} {download} class={classes} target={linkTarget} rel={linkRel}>
		{@render children()}
	</a>
{:else}
	<button {type} {disabled} {onclick} class={classes}>
		{@render children()}
	</button>
{/if}
