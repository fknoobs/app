<script lang="ts">
	import { untrack } from 'svelte';
	import type { InputProps } from '.';
	import { cn } from '$lib/utils';
	import {
		adornedActions,
		adornedControl,
		adornedControlDisabled,
		adornedInput,
		adornedLeading,
		adornedTrailing,
		controlBase,
		controlDisabled,
		controlReadonly,
		flushInput,
		stepperButton
	} from '../variants';
	import { Button } from '../button';
	import EyeIcon from 'phosphor-svelte/lib/EyeIcon';
	import EyeSlashIcon from 'phosphor-svelte/lib/EyeSlashIcon';
	import PlusIcon from 'phosphor-svelte/lib/PlusIcon';
	import MinusIcon from 'phosphor-svelte/lib/MinusIcon';
	import { useI18n } from '$lib/i18n';

	let {
		value = $bindable(),
		type,
		class: className,
		leading,
		trailing,
		flush = false,
		...restProps
	}: InputProps = $props();
	const { t } = useI18n();
	let showPasswordToggle = $state(untrack(() => type === 'password'));
	let hasAdornments = $derived(leading != null || trailing != null);
	const hasExtras = $derived(
		leading != null || trailing != null || showPasswordToggle || type === 'number'
	);

	function stepValue(direction: 1 | -1) {
		const step = restProps.step ? parseFloat(restProps.step.toString()) : 1;
		let next = (parseFloat(value) || 0) + direction * step;
		if (restProps.max !== undefined && next > parseFloat(restProps.max?.toString() ?? '0')) {
			next = parseFloat(restProps.max?.toString() ?? '0');
		}
		if (restProps.min !== undefined && next < parseFloat(restProps.min?.toString() ?? '0')) {
			next = parseFloat(restProps.min?.toString() ?? '0');
		}
		value = next.toString();
	}
</script>

{#if flush}
	{#if hasExtras}
		<div class={cn('flex min-w-0 flex-1 items-center gap-2', className)}>
			{#if leading}
				<span class="text-secondary-500 pointer-events-none shrink-0">
					{@render leading()}
				</span>
			{/if}
			<input
				bind:value
				{...restProps}
				type={type === 'number' ? 'text' : type}
				inputmode={type === 'number' ? 'numeric' : restProps.inputmode}
				class={cn(flushInput, controlDisabled, controlReadonly)}
				oninput={
					type === 'number'
						? () => {
								value = String(value).replace(/[^0-9.-]/g, '');
							}
						: restProps.oninput
				}
			/>
			{#if trailing}
				<span class="text-secondary-500 shrink-0">
					{@render trailing()}
				</span>
			{/if}
			{#if type === 'number'}
				<div class="flex shrink-0 items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						class="text-secondary-400"
						aria-label={t('Decrease value')}
						onclick={() => stepValue(-1)}
					>
						<MinusIcon size={12} weight="bold" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						class="text-secondary-400"
						aria-label={t('Increase value')}
						onclick={() => stepValue(1)}
					>
						<PlusIcon size={12} weight="bold" />
					</Button>
				</div>
			{:else if showPasswordToggle}
				<Button
					variant="ghost"
					size="icon-sm"
					type="button"
					class="text-secondary-400 shrink-0"
					onclick={() => (type = type === 'password' ? 'text' : 'password')}
				>
					{#if type === 'password'}
						<EyeSlashIcon />
					{:else}
						<EyeIcon />
					{/if}
				</Button>
			{/if}
		</div>
	{:else}
		<input
			bind:value
			{...restProps}
			{type}
			class={cn(flushInput, controlDisabled, controlReadonly, className)}
		/>
	{/if}
{:else if type === 'number'}
	<div
		class={cn(
			hasAdornments ? cn(adornedControl, adornedControlDisabled) : 'relative w-full',
			'min-w-0 flex-1',
			className
		)}
	>
		{#if leading}
			<span class={cn(adornedLeading, 'pointer-events-none')}>
				{@render leading()}
			</span>
		{/if}
		<input
			bind:value
			{...restProps}
			type="text"
			inputmode="numeric"
			class={cn(
				hasAdornments ? adornedInput : cn(controlBase, 'w-full px-4 pe-17'),
				controlDisabled,
				controlReadonly
			)}
			oninput={() => {
				value = String(value).replace(/[^0-9.-]/g, '');
			}}
		/>
		{#if trailing}
			<span class={adornedTrailing}>
				{@render trailing()}
			</span>
		{/if}
		<div
			class={cn(
				'flex items-center gap-1',
				hasAdornments ? adornedActions : 'absolute top-1/2 right-1.5 -translate-y-1/2'
			)}
		>
			<button
				type="button"
				class={stepperButton}
				aria-label={t('Decrease value')}
				onclick={() => stepValue(-1)}
			>
				<MinusIcon size={12} weight="bold" />
			</button>
			<button
				type="button"
				class={stepperButton}
				aria-label={t('Increase value')}
				onclick={() => stepValue(1)}
			>
				<PlusIcon size={12} weight="bold" />
			</button>
		</div>
	</div>
{:else if hasAdornments}
	<div class={cn(adornedControl, adornedControlDisabled, 'min-w-0 flex-1', className)}>
		{#if leading}
			<span class={cn(adornedLeading, 'pointer-events-none')}>
				{@render leading()}
			</span>
		{/if}
		<input
			bind:value
			{...restProps}
			{type}
			class={cn(adornedInput, controlDisabled, controlReadonly)}
		/>
		{#if trailing}
			<span class={adornedTrailing}>
				{@render trailing()}
			</span>
		{/if}
		{#if showPasswordToggle}
			<Button
				variant="ghost"
				size="icon-sm"
				type="button"
				class="text-secondary-400 border-secondary-800 shrink-0 border-l"
				onclick={() => (type = type === 'password' ? 'text' : 'password')}
			>
				{#if type === 'password'}
					<EyeSlashIcon />
				{:else}
					<EyeIcon />
				{/if}
			</Button>
		{/if}
	</div>
{:else}
	<div class={cn('relative w-full min-w-0 flex-1', className)}>
		<input
			bind:value
			{...restProps}
			{type}
			class={cn(controlBase, 'w-full px-4', controlDisabled, controlReadonly)}
		/>
		{#if showPasswordToggle}
			<Button
				variant="ghost"
				size="icon-sm"
				type="button"
				class="text-secondary-400 absolute top-1.5 right-1.5"
				onclick={() => (type = type === 'password' ? 'text' : 'password')}
			>
				{#if type === 'password'}
					<EyeSlashIcon />
				{:else}
					<EyeIcon />
				{/if}
			</Button>
		{/if}
	</div>
{/if}
