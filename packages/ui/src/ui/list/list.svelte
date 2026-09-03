<script lang="ts">
	import { cn } from '@company-of-heroes/ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = {} & HTMLAttributes<HTMLSpanElement>;

	let { children, ...restProps }: Props = $props();
</script>

<span class={cn('grid grid-cols-[auto_1fr] items-center gap-x-8 gap-y-1', restProps.class)}>
	{@render children?.()}
</span>
