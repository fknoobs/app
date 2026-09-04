<script lang="ts">
	import { page } from '$app/state';
	import HeaderMenu from '$lib/components/layout/header-menu.svelte';
	import { cn } from '$lib/utils/cn';
	import { dropdownItem, dropdownItemIcon, headerCellAction } from '$lib/utils/variants';
	import {
		currentLocale,
		localeLabels,
		locales,
		localeSwitchHref,
		useI18n,
		type AppLocale
	} from '$lib/i18n';
	import CaretDownIcon from 'phosphor-svelte/lib/CaretDownIcon';
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';
	import TranslateIcon from 'phosphor-svelte/lib/Translate';

	type Props = {
		class?: string;
		align?: 'start' | 'end';
	};

	let { class: className, align = 'end' }: Props = $props();
	const { t } = useI18n();
	const locale = $derived(currentLocale());

	function switchHref(next: AppLocale) {
		return localeSwitchHref(`${page.url.pathname}${page.url.search}${page.url.hash}`, next);
	}

	function select(next: AppLocale, close: () => void) {
		close();
		if (next === locale) {
			return;
		}

		window.location.assign(switchHref(next));
	}
</script>

<HeaderMenu {align} aria-label={t('Language')} triggerClass={cn(headerCellAction, 'gap-1.5 px-4', className)} panelClass="w-44">
	{#snippet trigger()}
		<TranslateIcon size={18} weight="duotone" class="text-primary shrink-0" />
		<span class="text-sm font-medium text-white">{localeLabels[locale]}</span>
		<CaretDownIcon size={14} weight="bold" class="text-secondary-400 shrink-0" />
	{/snippet}
	{#snippet children({ close })}
		{#each locales as item (item)}
			<button
				type="button"
				role="menuitem"
				class={cn(dropdownItem, dropdownItemIcon, 'flex w-full')}
				onclick={() => select(item, close)}
			>
				<CheckIcon
					size={18}
					weight="bold"
					class={cn('shrink-0', item === locale ? 'text-primary' : 'opacity-0')}
				/>
				{localeLabels[item]}
			</button>
		{/each}
	{/snippet}
</HeaderMenu>
