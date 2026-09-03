<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLFormAttributes } from 'svelte/elements';
	import { cn } from '@company-of-heroes/ui/cn';

	type Props = {
		children?: Snippet;
	} & HTMLFormAttributes;

	let { children, class: className, ...restProps }: Props = $props();
</script>

<form {...restProps} class={cn(className)}>
	{@render children?.()}
</form>
