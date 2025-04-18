<script lang="ts">
	import { Select, type WithoutChildren } from 'bits-ui';
	import { cn } from '$lib/utils';
	import CaretDownIcon from 'phosphor-svelte/lib/CaretDown';
	import CaretUpIcon from 'phosphor-svelte/lib/CaretUp';
	import CheckIcon from 'phosphor-svelte/lib/Check';

	type Props = WithoutChildren<Select.RootProps> & {
		placeholder?: string;
		items: { value: string; label: string; disabled?: boolean }[];
		contentProps?: WithoutChildren<Select.ContentProps>;
		// any other specific component props if needed
	};

	let { value = $bindable(), items, contentProps, placeholder, ...restProps }: Props = $props();

	const selectedLabel = $derived(items.find((item) => item.value === value)?.label);

	$inspect(value);
</script>

<!--
TypeScript Discriminated Unions + destructing (required for "bindable") do not
get along, so we shut typescript up by casting `value` to `never`, however,
from the perspective of the consumer of this component, it will be typed appropriately.
-->
<Select.Root bind:value={value as never} {...restProps}>
	<Select.Trigger
		class={cn(
			'group py-3 text-left',
			'border-secondary-200 flex max-w-3xs items-center justify-between border-b-2'
		)}
	>
		{selectedLabel ? selectedLabel : placeholder}
		<CaretDownIcon class="group-data-[state=open]:rotate-180" />
	</Select.Trigger>
	<Select.Portal>
		<Select.Content
			align="start"
			side="bottom"
			sideOffset={6}
			{...contentProps}
			class={cn('bg-secondary-50 max-h-64 max-w-3xs shadow-xs')}
		>
			<Select.ScrollUpButton class="flex items-center justify-center py-1">
				<CaretUpIcon />
			</Select.ScrollUpButton>
			<Select.Viewport>
				{#each items as { value, label, disabled } (value)}
					<Select.Item
						{value}
						{label}
						{disabled}
						class="hover:bg-secondary-100 flex items-center px-4 py-2"
					>
						{#snippet children({ selected })}
							{label}
							{#if selected}
								<CheckIcon class="ms-auto" />
							{/if}
						{/snippet}
					</Select.Item>
				{/each}
			</Select.Viewport>
			<Select.ScrollDownButton class="flex items-center justify-center py-1">
				<CaretDownIcon />
			</Select.ScrollDownButton>
		</Select.Content>
	</Select.Portal>
</Select.Root>
