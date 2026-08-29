<script lang="ts">
	import { Select, type WithoutChildren } from 'bits-ui';
	import { cn } from '$lib/utils';
	import { controlBase, menuItem } from '../variants';
	import CaretDownIcon from 'phosphor-svelte/lib/CaretDownIcon';
	import CaretUpIcon from 'phosphor-svelte/lib/CaretUpIcon';
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';
	import { isArray } from 'lodash-es';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	type Props = WithoutChildren<Select.RootProps> & {
		placeholder?: string;
		items: { value: string; label: string; disabled?: boolean }[];
		contentProps?: WithoutChildren<Select.ContentProps>;
		class?: string;
	};

	let {
		value = $bindable(),
		items,
		contentProps,
		placeholder,
		class: className,
		type = 'single',
		...restProps
	}: Props = $props();
	const selectedLabel = $derived(items.find((item) => item.value === value)?.label);
</script>

<!--
TypeScript Discriminated Unions + destructing (required for "bindable") do not
get along, so we shut typescript up by casting `value` to `never`, however,
from the perspective of the consumer of this component, it will be typed appropriately.
-->
<Select.Root {...restProps} {type} bind:value={value as never}>
	<Select.Trigger
		class={cn(
			controlBase,
			'group flex w-full min-w-28 cursor-pointer items-center justify-between truncate px-4 text-left',
			className
		)}
	>
		{isArray(value) && value.length
			? t('{count} items', { count: value.length })
			: selectedLabel
				? selectedLabel
				: placeholder}
		<CaretDownIcon class="ms-4 group-data-[state=open]:rotate-180" />
	</Select.Trigger>
	<Select.Portal>
		<Select.Content
			align="start"
			side="bottom"
			sideOffset={6}
			{...contentProps}
			class={cn(
				'overlay-surface border-secondary-800 z-50 max-h-64 min-w-[var(--bits-select-anchor-width)] w-[var(--bits-select-anchor-width)] rounded-md border shadow-md',
				contentProps?.class
			)}
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
						class={cn(menuItem, 'flex w-full items-center gap-4')}
					>
						{#snippet children({ selected })}
							{label}
							{#if selected}
								<CheckIcon class="ms-auto" weight="bold" />
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
