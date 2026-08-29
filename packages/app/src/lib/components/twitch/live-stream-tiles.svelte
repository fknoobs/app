<script lang="ts">
	import { openUrl } from '@tauri-apps/plugin-opener';
	import UsersIcon from 'phosphor-svelte/lib/UsersIcon';
	import type { LiveStream } from '$features/twitch/live-streams.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { interactive } from '$lib/components/ui/variants';
	import { cn } from '$lib/utils';
	import { useI18n } from '$lib/i18n';

	type Props = {
		items: LiveStream[];
		loading?: boolean;
		compact?: boolean;
	};

	let { items, loading = false, compact = false }: Props = $props();
	const { t } = useI18n();

	const skeletonCount = $derived(compact ? 6 : 3);
	const gridClass = $derived(
		compact
			? '-mr-px grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
			: '-mr-px grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
	);
	const tileBorder = $derived(
		compact
			? 'border-secondary-800 border-r border-t first:border-t-0 [&:nth-child(2)]:border-t-0 [&:nth-child(3)]:border-t-0 sm:[&:nth-child(4)]:border-t-0 lg:[&:nth-child(5)]:border-t-0 xl:[&:nth-child(6)]:border-t-0'
			: 'border-secondary-800 border-r border-t first:border-t-0 sm:[&:nth-child(2)]:border-t-0 lg:[&:nth-child(3)]:border-t-0'
	);

	function openStream(userName: string) {
		void openUrl(`https://www.twitch.tv/${userName}`);
	}
</script>

{#if loading}
	<div class={gridClass}>
		{#each { length: skeletonCount }, i (i)}
			<div class={tileBorder}>
				<Skeleton class="aspect-video w-full rounded-none" />
				<div class={cn(compact ? 'px-1.5 py-1' : 'space-y-2 p-3')}>
					<Skeleton class={cn('rounded-none', compact ? 'h-3 w-4/5' : 'h-4 w-4/5')} />
					{#if !compact}
						<Skeleton class="h-3 w-1/3 rounded-none" />
					{/if}
				</div>
			</div>
		{/each}
	</div>
{:else if items.length === 0}
	<p class="text-secondary-400 px-4 py-3 text-sm">
		{t('No one is streaming Company of Heroes right now.')}
	</p>
{:else}
	<div class={gridClass}>
		{#each items as stream (stream.id)}
			<button
				type="button"
				class={cn(
					interactive,
					tileBorder,
					'rounded-none text-left',
					'hover:bg-secondary-950/80 transition-colors'
				)}
				onclick={() => openStream(stream.userName)}
				title={compact ? stream.title : undefined}
			>
				<div class="bg-secondary-900 relative aspect-video overflow-hidden">
					<img src={stream.thumbnailUrl} alt={stream.title} class="size-full object-cover" />
					{#if !compact}
						<Badge variant="success" class="absolute top-2 left-2 rounded-none">{t('Live')}</Badge>
					{/if}
					<span
						class={cn(
							'absolute flex items-center gap-1 bg-red-600 text-white tabular-nums',
							compact
								? 'right-1 bottom-1 px-1 py-px text-[10px]'
								: 'right-2 bottom-2 px-1.5 py-0.5 text-xs'
						)}
					>
						<UsersIcon size={compact ? 9 : 12} />
						{stream.viewers}
					</span>
				</div>
				<div class={cn('flex min-w-0 flex-col', compact ? 'gap-0 px-1.5 py-1' : 'gap-0.5 p-3')}>
					<p
						class={cn(
							'font-semibold',
							compact ? 'truncate text-[11px] leading-tight' : 'line-clamp-2 text-sm'
						)}
					>
						{compact ? stream.userDisplayName : stream.title}
					</p>
					{#if !compact}
						<p class="text-secondary-400 truncate text-sm">{stream.userDisplayName}</p>
					{/if}
					{#if !compact && stream.gameName}
						<p class="text-secondary-500 truncate text-xs">{stream.gameName}</p>
					{/if}
				</div>
			</button>
		{/each}
	</div>
{/if}
