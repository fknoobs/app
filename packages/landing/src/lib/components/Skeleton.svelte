<script lang="ts">
	import { cn } from '$lib/cn';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = HTMLAttributes<HTMLDivElement>;

	let { class: className, ...restProps }: Props = $props();
</script>

<div class={cn('skeleton-shimmer rounded-lg', className)} aria-hidden="true" {...restProps}></div>
