<script lang="ts">
	import { goto } from '$app/navigation';
	import { watch } from 'runed';
	import { tabTrigger } from '$lib/components/ui/variants';
	import { app } from '$core/app/context';
	import NotificationsTab from './tabs/notifications-tab.svelte';
	import UsersTab from './tabs/users-tab.svelte';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();
	let tab = $state('notifications');

	watch(
		() => app.account.isStaff,
		(isStaff) => {
			if (!isStaff) {
				if (!app.account.isImpersonating) {
					app.toast.error(t('You do not have access to this page.'));
				}
				void goto('/');
			}
		}
	);
</script>

{#if app.account.isStaff}
	<div class="border-secondary-900 overflow-clip border-b">
		<div class="border-secondary-800 border-b">
			<div class="flex items-center gap-2 px-4 py-2">
				<button
					type="button"
					class={tabTrigger}
					data-state={tab === 'notifications' ? 'active' : undefined}
					onclick={() => (tab = 'notifications')}
				>
					{t('Notifications')}
				</button>
				{#if app.account.isAdmin}
					<button
						type="button"
						class={tabTrigger}
						data-state={tab === 'users' ? 'active' : undefined}
						onclick={() => (tab = 'users')}
					>
						{t('Users')}
					</button>
				{/if}
			</div>

			<div class="border-secondary-800 border-t">
				{#if tab === 'users' && app.account.isAdmin}
					<UsersTab />
				{:else}
					<NotificationsTab />
				{/if}
			</div>
		</div>
	</div>
{/if}
