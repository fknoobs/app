<script lang="ts">
	import { cn } from '$lib/utils';
	import type { InputProps } from '.';

	let { value = $bindable(), ...restProps }: InputProps = $props();
</script>

<div class="flex items-center">
	<input
		type="text"
		bind:value
		{...restProps}
		class={cn(
			'w-full border-b-2 border-neutral-300 py-3 focus:border-neutral-950 focus:outline-none',
			restProps.class
		)}
	/>
</div>
