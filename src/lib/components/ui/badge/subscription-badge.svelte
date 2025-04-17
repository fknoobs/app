<script lang="ts">
	import { cn } from '$lib/utils';
	import type { BadgeProps } from '.';

	let { tier, ...restProps }: BadgeProps = $props();
</script>

<span
	{...restProps}
	class={cn(
		'rounded-full p-px text-center text-xs text-neutral-400',
		'bg-gradient-to-br from-neutral-700 to-neutral-800',
		tier === 'starter' && 'bg-gradient-to-br from-lime-400 to-green-600 text-green-500',
		tier === 'creator' && 'bg-gradient-to-br from-orange-400 to-amber-700 text-amber-500',
		tier === 'pro' && 'bg-gradient-to-br from-blue-400 to-indigo-700 text-indigo-500',
		tier === 'enterprise' &&
			'bg-gradient-to-br from-purple-400 to-fuchsia-700 text-fuchsia-500',
		tier.startsWith('scale') && 'bg-gradient-to-br from-pink-500 to-rose-400 text-rose-300',
		restProps.class
	)}
>
	<span class={cn('inline-block rounded-full bg-neutral-900 px-6 py-1.5')}>{tier}</span>
</span>
