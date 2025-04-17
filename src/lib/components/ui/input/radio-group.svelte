<script lang="ts">
	import { RadioGroup, Label, type WithoutChildrenOrChild, useId } from 'bits-ui';
	import { cn } from '$lib/utils';

	type Item = {
		value: string;
		label: string;
		disabled?: boolean;
	};

	type Props = WithoutChildrenOrChild<RadioGroup.RootProps> & {
		items: Item[];
		direction?: 'horizontal' | 'vertical';
	};

	let {
		value = $bindable(''),
		ref = $bindable(null),
		items,
		direction = 'vertical',
		...restProps
	}: Props = $props();
</script>

<RadioGroup.Root
	bind:value
	bind:ref
	{...restProps}
	class={cn(
		'flex gap-2',
		direction === 'horizontal' && 'gap-6',
		direction === 'vertical' && 'flex-col',
		restProps.class
	)}
>
	{#each items as item}
		{@const id = useId()}
		<div class="flex items-center gap-2">
			<RadioGroup.Item
				{id}
				value={item.value}
				disabled={item.disabled}
				class={cn(
					'border-secondary-900 flex size-7 items-center justify-center overflow-clip rounded-full border-1 p-1', // Changed rounded-full to rounded-md
					item.disabled && 'cursor-not-allowed opacity-50'
				)}
			>
				{#snippet children({ checked })}
					{#if checked}
						<span class="bg-secondary-900 h-full w-full rounded-full"></span>
					{:else}
						<span class="bg-secondary-100 h-full w-full rounded-full"></span>
					{/if}
				{/snippet}
			</RadioGroup.Item>
			<Label.Root for={id}>{item.label}</Label.Root>
		</div>
	{/each}
</RadioGroup.Root>
