<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { type Snippet } from 'svelte';
	import { Command, Dialog } from 'bits-ui';
	import { cn } from '$lib/utils';
	import { interactive, overlayBackdrop, surfaceModal, controlBase, flushInput, menuItem } from '../variants';
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';
	import CaretDownIcon from 'phosphor-svelte/lib/CaretDownIcon';
	import PencilSimpleIcon from 'phosphor-svelte/lib/PencilSimpleIcon';
	import { selectionPicker } from './selection-picker';
	import { useI18n } from '$lib/i18n';
	import { Debounced, resource } from 'runed';

	const PAGE_SIZE = 50;

	type Option = {
		value: string;
		label: string;
		child?: Snippet<[{ value: string; label: string }]>;
	};

	type Props = {
		options: Option[];
		open?: boolean;
		placeholder?: string;
		multiple?: boolean;
		icon?: Snippet;
		getDisplayLabel?: (option: Option) => string;
		onEditSelected?: (value: string, event: Event) => void;
		onSearch?: (query: string) => Promise<Option[]>;
		hideTrigger?: boolean;
	} & HTMLInputAttributes;

	let {
		value = $bindable(),
		open = $bindable(false),
		options,
		placeholder = 'Select an option...',
		multiple = false,
		icon,
		getDisplayLabel,
		onEditSelected,
		onSearch,
		hideTrigger = false,
		class: className
	}: Props = $props();
	const { t } = useI18n();

	let search = $state('');
	let displayedCount = $state(PAGE_SIZE);
	const debouncedSearch = new Debounced(() => search, 200);
	const remoteResults = resource(
		() => [open, debouncedSearch.current] as const,
		([isOpen, query]) => {
			if (!onSearch || !isOpen) {
				return Promise.resolve([] as Option[]);
			}
			return onSearch(query);
		}
	);

	let selectedValues = $derived.by(() => {
		if (multiple) {
			return Array.isArray(value) ? value : value ? [value] : [];
		}
		return [];
	});

	let knownOptions = $derived.by(() => {
		const byValue: Record<string, Option> = {};
		for (const option of options) {
			byValue[option.value] = option;
		}
		for (const option of remoteResults.current ?? []) {
			byValue[option.value] = option;
		}
		return Object.values(byValue);
	});

	let filteredOptions = $derived.by(() => {
		if (onSearch) {
			const fetched = remoteResults.current ?? [];
			if (fetched.length > 0) return fetched;
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

	let displayedOptions = $derived(filteredOptions.slice(0, displayedCount));

	let displayText = $derived.by(() => {
		const labelFor = (option: { value: string; label: string }) =>
			getDisplayLabel?.(option) ?? option.label;

		if (multiple) {
			const selected = selectedValues;
			if (selected.length === 0) return t(placeholder);
			if (selected.length === 1) {
				const option = knownOptions.find((opt) => opt.value === selected[0]);
				return option ? labelFor(option) : t(placeholder);
			}
			return t('{count} selected', { count: selected.length });
		}

		const option = value ? knownOptions.find((option) => option.value === value) : undefined;
		return option ? labelFor(option) : t(placeholder);
	});

	$effect(() => {
		if (!open) return;
		search = '';
		displayedCount = PAGE_SIZE;
		return selectionPicker.mountEscapeHandler(closePicker);
	});

	$effect(() => {
		if (open) {
			document.documentElement.dataset.selectionPickerOpen = '';
			return () => {
				delete document.documentElement.dataset.selectionPickerOpen;
			};
		}
	});

	$effect(() => {
		search;
		displayedCount = PAGE_SIZE;
	});

	function isSelected(optionValue: string): boolean {
		if (multiple) {
			return selectedValues.includes(optionValue);
		}
		return value === optionValue;
	}

	function closePicker() {
		open = false;
	}

	function selectOption(option: Option) {
		if (multiple) {
			const currentValues = selectedValues;
			if (currentValues.includes(option.value)) {
				value = currentValues.filter((v) => v !== option.value);
			} else {
				value = [...currentValues, option.value];
			}
			return;
		}

		value = option.value;
		closePicker();
	}

	function removeValue(valueToRemove: string, event: Event) {
		event.stopPropagation();
		if (multiple) {
			value = selectedValues.filter((v) => v !== valueToRemove);
		}
	}

	function viewport(node: HTMLElement) {
		const observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting && displayedCount < filteredOptions.length) {
				displayedCount += PAGE_SIZE;
			}
		});

		observer.observe(node);

		return {
			destroy() {
				observer.disconnect();
			}
		};
	}
</script>

{#if !hideTrigger && multiple && selectedValues.length > 0}
	<div class="mb-2 flex flex-wrap items-center gap-1.5">
		<button
			type="button"
			class={cn(interactive, 'text-destructive/80 hover:text-destructive text-xs')}
			onclick={() => {
				value = multiple ? [] : '';
			}}
		>
			{t('Clear All')}
		</button>

		{#each selectedValues as selectedValue (selectedValue)}
			{@const opt =
				knownOptions.find((o) => o.value === selectedValue) ??
				options.find((o) => o.value === selectedValue)}
			{#if opt}
				<span
					class={cn(
						'inline-flex max-w-xs items-center gap-0.5 rounded border py-0.5 ps-2 pe-1 text-xs',
						'border-secondary-600 bg-secondary-800/60 hover:bg-secondary-800'
					)}
				>
					<span class="truncate">{getDisplayLabel?.(opt) ?? opt.label}</span>
					{#if onEditSelected}
						<button
							type="button"
							class={cn(
								interactive,
								'text-secondary-400 hover:text-secondary-200 shrink-0 rounded p-0.5'
							)}
							aria-label={t('Edit alias')}
							onpointerdown={(e) => {
								e.preventDefault();
								e.stopPropagation();
							}}
							onmousedown={(e) => e.stopPropagation()}
							onclick={(e) => onEditSelected(selectedValue, e)}
						>
							<PencilSimpleIcon size={12} />
						</button>
					{/if}
					<button
						type="button"
						class={cn(
							interactive,
							'text-secondary-400 hover:text-destructive/80 shrink-0 rounded p-0.5'
						)}
						aria-label={t('Remove')}
						onclick={(e) => removeValue(selectedValue, e)}
					>
						<XIcon size={12} />
					</button>
				</span>
			{/if}
		{/each}
	</div>
{/if}

{#if !hideTrigger}
	<button
		type="button"
		onclick={() => (open = true)}
		class={cn(
			controlBase,
			interactive,
			'group flex w-fit max-w-64 min-w-40 items-center justify-between truncate px-4 text-left',
			className
		)}
	>
		{#if icon}
			<span class="size-fit shrink-0">{@render icon()}</span>
		{/if}
		<span class="min-w-0 flex-1 truncate text-left">{displayText}</span>
		<CaretDownIcon class="ms-2 shrink-0" />
	</button>
{/if}

<Dialog.Root bind:open>
	{#if open}
		<Dialog.Portal>
			<Dialog.Overlay data-selection-picker class={cn(overlayBackdrop, 'fixed inset-0 z-9999')} />
			<Dialog.Content
				data-selection-picker
				class="fixed top-24 left-1/2 z-9999 w-full max-w-lg -translate-x-1/2 px-4 outline-hidden"
			>
				<Dialog.Title class="sr-only">{t('Select option')}</Dialog.Title>
				<Command.Root
					label={t('Select option')}
					loop
					shouldFilter={false}
					class={cn(
						surfaceModal,
						'divide-secondary-800 flex w-full flex-col divide-y overflow-hidden'
					)}
				>
					<Command.Input
						bind:value={search}
						class={cn(flushInput, 'px-4 py-3 text-sm')}
						placeholder={t('Search...')}
					/>
					<Command.List class="max-h-60 overflow-x-hidden overflow-y-auto">
						<Command.Viewport>
							{#if displayedOptions.length === 0}
								<Command.Empty
									class="text-secondary-400 flex items-center justify-center py-6 text-sm"
								>
									{t('No results found.')}
								</Command.Empty>
							{:else}
								<Command.Group>
									<Command.GroupItems class="p-2">
										{#each displayedOptions as option (option.value)}
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
												{#if option.child}
													{@render option.child({ value: option.value, label: option.label })}
												{:else}
													{option.label}
												{/if}
											</Command.Item>
										{/each}
										{#if displayedCount < filteredOptions.length}
											<div use:viewport class="h-px w-full"></div>
										{/if}
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
