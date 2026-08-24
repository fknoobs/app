<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { cn } from '$lib/utils';
	import { interactive } from '$lib/components/ui/variants';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import ArrowDownIcon from 'phosphor-svelte/lib/ArrowDownIcon';
	import ArrowUpIcon from 'phosphor-svelte/lib/ArrowUpIcon';
	import ArrowsDownUpIcon from 'phosphor-svelte/lib/ArrowsDownUpIcon';
	import type { ColumnDef, DataTableProps } from './table.types';

	type Props = DataTableProps<T>;

	let {
		data,
		columns,
		rowKey,
		rowHref,
		onRowClick,
		isRowExpanded,
		rowClass,
		loading = false,
		skeletonRows = 5,
		empty = 'No results.',
		showHeader = true,
		class: className,
		headerClass,
		headerRowClass,
		bodyRowClass,
		children,
		rowWrapper,
		cells = {},
		headers = {},
		tableLayout = 'fixed',
		density = 'default',
		striped = false
	}: Props = $props();

	const isCompact = $derived(density === 'compact');
	const cellPad = $derived(isCompact ? 'px-4 py-1.5' : 'px-4');
	const headerPad = $derived(isCompact ? 'px-4 py-2' : 'px-4 py-3');
	const rowHeight = $derived(isCompact ? 'h-9' : 'h-11');
	const stripeClass = $derived(striped ? 'odd:bg-secondary-600/5' : undefined);

	function getCellSnippet(column: ColumnDef<T>): Snippet<[{ row: T }]> | undefined {
		return column.cell ?? cells[column.id];
	}

	function getHeaderSnippet(column: ColumnDef<T>): Snippet | string {
		if (headers[column.id]) {
			return headers[column.id]!;
		}
		return column.header;
	}

	function getCellContent(row: T, column: ColumnDef<T>): unknown {
		if (column.accessor) {
			return column.accessor(row);
		}
		return undefined;
	}

	function navigate(href: string) {
		void goto(href);
	}

	function handleRowClick(event: MouseEvent, href: string | undefined, row: T) {
		const target = event.target as HTMLElement;
		if (target.closest('a, button')) return;
		if (onRowClick) {
			onRowClick(row);
			return;
		}
		if (!href) return;
		navigate(href);
	}
</script>

{#snippet rowCells(row: T)}
	{#each columns as column (column.id)}
		{@const cellSnippet = getCellSnippet(column)}
		{@const cellHref = column.href?.(row)}
		<td class={cn(cellPad, column.cellClass?.(row))}>
			{#if cellSnippet}
				{#if cellHref}
					<a href={cellHref} class={cn('hover:text-primary flex min-w-0 items-center gap-4 transition-colors', column.class)}>
						{@render cellSnippet({ row })}
					</a>
				{:else}
					<div class={cn('flex min-w-0 items-center', column.class)}>
						{@render cellSnippet({ row })}
					</div>
				{/if}
			{:else if cellHref}
				<a href={cellHref} class={cn('hover:text-primary flex min-w-0 items-center transition-colors', column.class)}>
					{getCellContent(row, column) ?? ''}
				</a>
			{:else}
				<div class={cn('flex min-w-0 items-center', column.class)}>
					{getCellContent(row, column) ?? ''}
				</div>
			{/if}
		</td>
	{/each}
{/snippet}

{#snippet skeletonRow()}
	<tr class={cn(rowHeight, 'border-secondary-800 border-b', stripeClass, bodyRowClass)}>
		{#each columns as column (column.id)}
			<td class={cn(cellPad, column.hideSkeleton && 'p-0')}>
				{#if column.hideSkeleton}
					<!-- spacer -->
				{:else}
					<Skeleton class="h-4 w-full" />
				{/if}
			</td>
		{/each}
	</tr>
{/snippet}

{#snippet dataRow(row: T)}
	{@const href = rowHref?.(row)}
	{@const clickable = href || onRowClick}
	{@const expanded = isRowExpanded?.(row) ?? false}
	<tr
		class={cn(
			rowHeight,
			'border-secondary-800 border-b',
			stripeClass,
			bodyRowClass,
			clickable && 'hover:text-primary cursor-pointer transition-colors',
			clickable && 'hover:bg-secondary-950/60',
			expanded && 'bg-secondary-950/60 text-primary',
			rowClass?.(row)
		)}
		tabindex={clickable ? 0 : undefined}
		role={href ? 'link' : onRowClick ? 'button' : undefined}
		aria-expanded={onRowClick ? expanded : undefined}
		onclick={(event) => handleRowClick(event, href, row)}
		onkeydown={(event) => {
			if (!clickable) return;
			if (event.key !== 'Enter' && event.key !== ' ') return;
			event.preventDefault();
			if (onRowClick) {
				onRowClick(row);
				return;
			}
			if (href) navigate(href);
		}}
	>
		{@render rowCells(row)}
	</tr>
{/snippet}

<div class={cn(className)}>
	<table class={cn('w-full', tableLayout === 'auto' ? 'table-auto' : 'table-fixed')}>
		<colgroup>
			{#each columns as column (column.id)}
				<col class={column.width} />
			{/each}
		</colgroup>
		{#if showHeader}
			<thead class={headerClass}>
				<tr
					class={cn(
						'bg-secondary-950/90 text-secondary-300 border-secondary-800 border-b text-left text-xs font-semibold tracking-wide uppercase',
						headerRowClass
					)}
				>
					{#each columns as column (column.id)}
						{@const header = getHeaderSnippet(column)}
						<th
							class={cn(headerPad, column.headerCellClass)}
							aria-sort={column.sortDirection === 'asc'
								? 'ascending'
								: column.sortDirection === 'desc'
									? 'descending'
									: column.sortable
										? 'none'
										: undefined}
						>
							{#if column.sortable}
								<button
									type="button"
									class={cn(
										interactive,
										'flex w-full min-w-0 items-center bg-transparent p-0 text-inherit select-none',
										typeof header === 'string' && 'gap-1',
										column.headerClass
									)}
									aria-label={typeof header === 'string' ? `Sort by ${header}` : undefined}
									onclick={column.onSort}
								>
									{#if typeof header === 'string'}
										{header}
										{#if column.sortDirection === 'desc'}
											<ArrowDownIcon size={14} class="shrink-0" weight="duotone" />
										{:else if column.sortDirection === 'asc'}
											<ArrowUpIcon size={14} class="shrink-0" weight="duotone" />
										{:else}
											<ArrowsDownUpIcon size={14} class="shrink-0" weight="duotone" />
										{/if}
									{:else}
										{@render header()}
									{/if}
								</button>
							{:else}
								<div class={cn('min-w-0', column.headerClass)}>
									{#if typeof header === 'string'}
										{header}
									{:else}
										{@render header()}
									{/if}
								</div>
							{/if}
						</th>
					{/each}
				</tr>
			</thead>
		{/if}
		<tbody>
			{#if loading}
				{#each Array(skeletonRows) as _, index (index)}
					{@render skeletonRow()}
				{/each}
			{:else if data.length === 0}
				<tr>
					<td colspan={columns.length} class={cn('text-secondary-400 text-sm', cellPad, isCompact ? '' : 'py-3')}>
						{empty}
					</td>
				</tr>
			{:else}
				{#each data as row (rowKey(row))}
					{#if rowWrapper}
						{#snippet rowContent()}
							{@render dataRow(row)}
						{/snippet}
						{@render rowWrapper({ row, children: rowContent })}
					{:else}
						{@render dataRow(row)}
					{/if}
				{/each}
			{/if}
		</tbody>
		{#if children}
			<tfoot>
				<tr>
					<td colspan={columns.length} class={cn('border-secondary-800 border-t', cellPad, isCompact ? 'py-2' : 'py-3')}>
						{@render children()}
					</td>
				</tr>
			</tfoot>
		{/if}
	</table>
</div>
