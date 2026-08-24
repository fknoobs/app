<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = {} & HTMLAttributes<HTMLDivElement>;

	let { class: className, ...restProps }: Props = $props();
</script>

<div
	class={cn('relative overflow-hidden rounded-lg bg-secondary-800/90', className)}
	{...restProps}
>
	<div
		class="absolute inset-0 -translate-x-full animate-shimmer bg-linear-to-r from-transparent via-secondary-600/35 to-transparent"
	></div>
</div>
