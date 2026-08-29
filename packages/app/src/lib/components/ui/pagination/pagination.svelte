<script lang="ts">
	import { cn } from '$lib/utils';
	import { Pagination, type PaginationRootProps } from 'bits-ui';
	import { watch } from 'runed';
	import CaretLeftIcon from 'phosphor-svelte/lib/CaretLeftIcon';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';
	import { controlBase, tabTrigger } from '../variants';
	import { useI18n } from '$lib/i18n';

	let {
		page = $bindable<number>(),
		count,
		perPage = 1,
		...restProps
	}: PaginationRootProps = $props();
	const { t } = useI18n();

	let pageInput = $state('');
	let totalPages = $derived(Math.max(1, Math.ceil(count / perPage)));

	function commitPageInput() {
		const parsed = Number.parseInt(pageInput, 10);

		if (!Number.isFinite(parsed)) {
			pageInput = String(page);
			return;
		}

		const clamped = Math.min(Math.max(1, parsed), totalPages);
		page = clamped;
		pageInput = String(clamped);
	}

	function onPageInputKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			commitPageInput();
		}
	}

	watch(
		() => page,
		() => {
			pageInput = String(page);
		}
	);
</script>

<Pagination.Root {...restProps} {count} {perPage} bind:page>
	{#snippet children({ pages })}
		<div class="flex items-center gap-2">
			<Pagination.PrevButton
				class={cn(tabTrigger, 'inline-flex size-8 items-center justify-center px-0 py-0')}
			>
				<CaretLeftIcon class="size-4" />
			</Pagination.PrevButton>
			<div class="flex items-center gap-1">
				{#each pages as pageItem (pageItem.key)}
					{#if pageItem.type === 'ellipsis'}
						<div class="text-foreground-alt text-sm font-medium select-none">...</div>
					{:else}
						<Pagination.Page
							page={pageItem}
							class={cn(
								tabTrigger,
								'inline-flex size-9 items-center justify-center px-0 py-0 font-medium',
								'data-selected:border-primary/20 data-selected:bg-primary/5 data-selected:text-primary'
							)}
						>
							{pageItem.value}
						</Pagination.Page>
					{/if}
				{/each}
			</div>
			<Pagination.NextButton
				class={cn(tabTrigger, 'inline-flex size-8 items-center justify-center px-0 py-0')}
			>
				<CaretRightIcon class="size-4" />
			</Pagination.NextButton>
			<div class="text-secondary-400 ms-2 flex items-center gap-1.5 text-sm">
				<input
					type="text"
					inputmode="numeric"
					aria-label={t('Page number')}
					bind:value={pageInput}
					onkeydown={onPageInputKeydown}
					onblur={commitPageInput}
					class={cn(controlBase, 'h-9 w-12 rounded-none px-1 text-center text-sm')}
				/>
				<span>/ {totalPages}</span>
			</div>
		</div>
	{/snippet}
</Pagination.Root>
