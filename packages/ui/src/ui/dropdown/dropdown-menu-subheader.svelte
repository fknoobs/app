<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '@company-of-heroes/ui/cn';
	import { dropdownSubheader } from '../../variants';

	type Props = {
		children: Snippet;
	} & HTMLAttributes<HTMLDivElement>;

	let { children, class: className, ...restProps }: Props = $props();
</script>

<div {...restProps} class={cn(dropdownSubheader, className)}>
	{@render children()}
</div>
