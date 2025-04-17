<script lang="ts">
	import type { LinkProps } from '.';
	import { page } from '$app/state';
	import { cn } from '$lib/utils';

	let { children, ...restProps }: LinkProps = $props();
</script>

<a
	{...restProps}
	class={cn(
		'bg-secondary-700 rounded-md px-4 py-3 font-bold text-white transition-all',
		restProps.href === page.url.pathname && 'bg-primary text-black',
		restProps.class
	)}
>
	{@render children()}
</a>
