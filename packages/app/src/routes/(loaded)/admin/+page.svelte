<script lang="ts">
	import { goto } from '$app/navigation';
	import { watch } from 'runed';
	import * as Tabs from '$lib/components/ui/tabs';
	import { app } from '$core/app/context';
	import NotificationsTab from './tabs/notifications-tab.svelte';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	watch(
		() => app.account.isStaff,
		(isStaff) => {
			if (!isStaff) {
				app.toast.error(t('You do not have access to this page.'));
				void goto('/');
			}
		}
	);
</script>

{#if app.account.isStaff}
	<div class="px-5 py-4">
		<Tabs.Root value="notifications">
			<Tabs.List>
				<Tabs.Trigger value="notifications">{t('Notifications')}</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="notifications">
				<NotificationsTab />
			</Tabs.Content>
		</Tabs.Root>
	</div>
{/if}
