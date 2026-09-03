<script lang="ts">
	import { goto } from '$app/navigation';
	import { watch } from 'runed';
	import { tabTrigger } from '$lib/components/ui/variants';
	import { app } from '$core/app/context';
	import NotificationsTab from './tabs/notifications-tab.svelte';
	import UsersTab from './tabs/users-tab.svelte';
	import LabelsTab from './tabs/labels-tab.svelte';
	import ReputationTab from './tabs/reputation-tab.svelte';
	import FlaggedTab from './tabs/flagged-tab.svelte';
	import DenylistTab from './tabs/denylist-tab.svelte';
	import HiddenMatchesTab from './tabs/hidden-matches-tab.svelte';
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
	<div class="border-secondary-900 border-b">
		<div class="border-secondary-800 border-b">
			<div class="flex flex-wrap items-center gap-2 px-4 py-2">
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
					<button
						type="button"
						class={tabTrigger}
						data-state={tab === 'labels' ? 'active' : undefined}
						onclick={() => (tab = 'labels')}
					>
						{t('Labels')}
					</button>
					<button
						type="button"
						class={tabTrigger}
						data-state={tab === 'reputation' ? 'active' : undefined}
						onclick={() => (tab = 'reputation')}
					>
						{t('Reputation')}
					</button>
				{/if}
				<button
					type="button"
					class={tabTrigger}
					data-state={tab === 'flagged' ? 'active' : undefined}
					onclick={() => (tab = 'flagged')}
				>
					{t('Flagged')}
				</button>
				<button
					type="button"
					class={tabTrigger}
					data-state={tab === 'denylist' ? 'active' : undefined}
					onclick={() => (tab = 'denylist')}
				>
					{t('Denylist')}
				</button>
				<button
					type="button"
					class={tabTrigger}
					data-state={tab === 'hidden-matches' ? 'active' : undefined}
					onclick={() => (tab = 'hidden-matches')}
				>
					{t('Hidden matches')}
				</button>
			</div>

			<div class="border-secondary-800 border-t">
				{#if tab === 'users' && app.account.isAdmin}
					<UsersTab />
				{:else if tab === 'labels' && app.account.isAdmin}
					<LabelsTab />
				{:else if tab === 'reputation' && app.account.isAdmin}
					<ReputationTab />
				{:else if tab === 'flagged'}
					<FlaggedTab />
				{:else if tab === 'denylist'}
					<DenylistTab />
				{:else if tab === 'hidden-matches'}
					<HiddenMatchesTab />
				{:else}
					<NotificationsTab />
				{/if}
			</div>
		</div>
	</div>
{/if}
