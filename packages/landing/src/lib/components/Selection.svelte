<script lang="ts">
	import { Command, Dialog } from 'bits-ui';
	import { cn } from '$lib/cn';
	import {
		flushInput,
		interactive,
		menuItem,
		overlayBackdrop,
		surfaceModal
	} from '$lib/variants';
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';

	export type SelectionOption = {
		value: string;
		label: string;
	};

	type Props = {
		value?: string | string[];
		open?: boolean;
		options: SelectionOption[];
		placeholder?: string;
		multiple?: boolean;
		hideTrigger?: boolean;
		onSearch?: (query: string) => Promise<SelectionOption[]> | SelectionOption[];
		onValueChange?: (value: string | string[]) => void;
	};

	let {
		value = $bindable(''),
		open = $bindable(false),
		options,
		placeholder = 'Select an option...',
		multiple = false,
		hideTrigger = false,
		onSearch,
		onValueChange
	}: Props = $props();

	let search = $state('');
	let remoteOptions = $state<SelectionOption[]>([]);

	const selectedValues = $derived(Array.isArray(value) ? value : value ? [value] : []);

	const knownOptions = $derived.by(() => {
		const byValue: Record<string, SelectionOption> = {};
		for (const option of options) byValue[option.value] = option;
		for (const option of remoteOptions) byValue[option.value] = option;
		return Object.values(byValue);
	});

	const filteredOptions = $derived.by(() => {
		if (onSearch) {
			if (remoteOptions.length > 0) return remoteOptions;
			const query = search.trim().toLowerCase();
			if (!query) return options;
			return options.filter(
				(option) =>
					option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query)
			);
		}
		const query = search.trim().toLowerCase();
		if (!query) return options;
		return options.filter(
			(option) =>
				option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query)
		);
	});

	const displayText = $derived.by(() => {
		if (multiple) {
			if (selectedValues.length === 0) return placeholder;
			if (selectedValues.length === 1) {
				return knownOptions.find((option) => option.value === selectedValues[0])?.label ?? placeholder;
			}
			return `${selectedValues.length} selected`;
		}
		const option = value ? knownOptions.find((item) => item.value === value) : undefined;
		return option?.label ?? placeholder;
	});

	function emit(next: string | string[]) {
		value = next;
		onValueChange?.(next);
	}

	function isSelected(optionValue: string) {
		if (multiple) return selectedValues.includes(optionValue);
		return value === optionValue;
	}

	function selectOption(option: SelectionOption) {
		if (multiple) {
			if (selectedValues.includes(option.value)) {
				emit(selectedValues.filter((item) => item !== option.value));
			} else {
				emit([...selectedValues, option.value]);
			}
			return;
		}
		emit(option.value);
		open = false;
	}

	async function runSearch(query: string) {
		if (!onSearch) return;
		remoteOptions = await onSearch(query);
	}

	$effect(() => {
		if (!open || !onSearch) return;
		const query = search;
		const handle = setTimeout(() => void runSearch(query), 200);
		return () => clearTimeout(handle);
	});
</script>

{#if !hideTrigger}
	<button type="button" class={cn(interactive, 'max-w-48 truncate')} onclick={() => (open = true)}>
		{displayText}
	</button>
{/if}

<Dialog.Root bind:open>
	{#if open}
		<Dialog.Portal>
			<Dialog.Overlay class={cn(overlayBackdrop, 'fixed inset-0 z-9999')} />
			<Dialog.Content
				class="fixed top-24 left-1/2 z-9999 w-full max-w-lg -translate-x-1/2 px-4 outline-hidden"
			>
				<Dialog.Title class="sr-only">{placeholder}</Dialog.Title>
				<Command.Root
					label={placeholder}
					loop
					shouldFilter={false}
					class={cn(surfaceModal, 'divide-secondary-800 flex w-full flex-col divide-y overflow-hidden')}
				>
					<Command.Input
						bind:value={search}
						class={cn(flushInput, 'px-4 py-3 text-sm')}
						placeholder="Search..."
					/>
					<Command.List class="max-h-60 overflow-x-hidden overflow-y-auto">
						<Command.Viewport>
							{#if filteredOptions.length === 0}
								<Command.Empty class="text-secondary-400 flex items-center justify-center py-6 text-sm">
									No results found.
								</Command.Empty>
							{:else}
								<Command.Group>
									<Command.GroupItems class="p-2">
										{#each filteredOptions as option (option.value)}
											<Command.Item
												value={option.value}
												keywords={[option.label]}
												onSelect={() => selectOption(option)}
												class={cn(
													menuItem,
													'flex w-full items-center gap-4 px-4 py-2.5 text-left text-sm outline-hidden',
													'data-selected:bg-secondary-900 data-selected:text-white'
												)}
											>
												{#if multiple}
													<span
														class={cn(
															'border-secondary-800 flex size-6 items-center justify-center rounded border p-1',
															isSelected(option.value) && 'bg-secondary-600'
														)}
													>
														{#if isSelected(option.value)}
															<CheckIcon weight="bold" />
														{/if}
													</span>
												{/if}
												{option.label}
											</Command.Item>
										{/each}
									</Command.GroupItems>
								</Command.Group>
							{/if}
						</Command.Viewport>
					</Command.List>
				</Command.Root>
			</Dialog.Content>
		</Dialog.Portal>
	{/if}
</Dialog.Root>
