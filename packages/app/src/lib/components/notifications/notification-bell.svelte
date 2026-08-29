<script lang="ts">
	import { cn } from '$lib/utils';
	import { Popover } from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { interactive } from '$lib/components/ui/variants';
	import BellIcon from 'phosphor-svelte/lib/BellIcon';
	import dayjs from '$lib/dayjs';
	import { app } from '$core/app/context';
	import type { NotificationItem } from '$core/notifications/notifications.svelte';
	import { useI18n } from '$lib/i18n';

	let open = $state(false);
	const { t } = useI18n();
	const skeletonRows = [0, 1, 2];

	const onOpenChange = (next: boolean) => {
		open = next;
		if (next) {
			void app.notifications.refresh();
		}
	};

	const openNotification = async (notification: NotificationItem) => {
		open = false;
		await app.notifications.open(notification);
	};
</script>

<Popover
	bind:open
	{onOpenChange}
	side="right"
	align="center"
	sideOffset={12}
	contentClass="w-[360px] overflow-hidden p-0"
>
	{#snippet trigger({ props })}
		<Button
			{...props}
			variant="ghost"
			size="icon-sm"
			class="bg-secondary-800 text-secondary-400 hover:text-primary hover:bg-secondary-700 data-[state=open]:bg-secondary-700 data-[state=open]:text-primary relative"
			aria-label={t('Notifications')}
		>
			<BellIcon size={18} weight="duotone" />
			{#if app.notifications.unreadCount > 0}
				{@const badgeLabel =
					app.notifications.unreadCount > 9 ? '9+' : String(app.notifications.unreadCount)}
				<span
					class={cn(
						'bg-primary text-secondary-950 absolute -top-1 -right-1 flex items-center justify-center rounded-full text-[10px] font-bold leading-none tabular-nums',
						badgeLabel.length > 1 ? 'h-4 min-w-4 px-1' : 'size-4'
					)}
				>
					{badgeLabel}
				</span>
			{/if}
		</Button>
	{/snippet}
	<div class="border-secondary-800 flex items-center justify-between border-b px-4 py-3">
		<h2 class="text-secondary-300 text-xs font-semibold tracking-wide uppercase">
			{t('Notifications')}
		</h2>
		{#if app.notifications.unreadCount > 0}
			<Badge variant="primary" class="px-2 py-0.5">
				{t('{count} unread', { count: app.notifications.unreadCount })}
			</Badge>
		{:else}
			<span class="text-secondary-500 text-xs">{t('All read')}</span>
		{/if}
	</div>

	<div class="max-h-90 overflow-y-auto">
		{#if app.notifications.isLoading && app.notifications.items.length === 0}
			<div class="divide-secondary-800 divide-y">
				{#each skeletonRows as row (row)}
					<div class="border-l-2 border-transparent px-4 py-2.5">
						<div class="flex min-w-0 flex-col gap-1.5">
							<Skeleton class="h-3.5 w-4/5" />
							<Skeleton class="h-3 w-16" />
						</div>
					</div>
				{/each}
			</div>
		{:else if app.notifications.items.length === 0}
			<div class="text-secondary-400 flex flex-col items-center gap-2 px-4 py-8 text-center text-sm">
				<BellIcon size={28} weight="duotone" class="text-secondary-600" />
				<p>{t('No notifications')}</p>
			</div>
		{:else}
			<ul class="divide-secondary-800 divide-y">
				{#each app.notifications.items as notification (notification.id)}
					<li>
						<button
							type="button"
							class={cn(
								interactive,
								'flex w-full flex-col border-l-2 px-4 py-2.5 text-left transition-colors hover:bg-secondary-950/50',
								notification.read
									? 'border-transparent'
									: 'bg-secondary-950/80 border-primary'
							)}
							onclick={() => openNotification(notification)}
						>
							<span
								class={cn(
									'line-clamp-2 text-sm',
									notification.read ? 'text-secondary-300' : 'font-medium text-white'
								)}
							>
								{notification.title}
							</span>
							<time
								class="text-secondary-500 mt-0.5 text-xs tabular-nums"
								datetime={notification.created}
							>
								{dayjs(notification.created).fromNow()}
							</time>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</Popover>
