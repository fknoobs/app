<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { SemanticVariant } from '../variants';

	type Props = {
		variant?: SemanticVariant | 'primary';
	} & HTMLAttributes<HTMLSpanElement>;

	const { variant = 'primary', children, ...restProps }: Props = $props();
</script>

<span
	{...restProps}
	class={cn(
		'inline-block w-fit rounded-md border px-2.5 py-0.5 text-xs font-medium',
		variant === 'primary' && 'border-primary/20 bg-primary/5 text-primary',
		variant === 'default' && 'border-secondary-700 bg-secondary-800/30 text-secondary-300',
		variant === 'destructive' && 'border-destructive/20 bg-destructive/5 text-destructive',
		variant === 'warning' && 'border-warning/20 bg-warning/5 text-warning',
		variant === 'success' && 'border-success/20 bg-success/5 text-success',
		variant === 'info' && 'border-info/20 bg-info/5 text-info',
		restProps.class
	)}
>
	{@render children?.()}
</span>
