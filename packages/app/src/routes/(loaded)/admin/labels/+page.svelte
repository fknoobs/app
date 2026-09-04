<script lang="ts">
	import { goto } from '$app/navigation';
	import { watch } from 'runed';
	import { app } from '$core/app/context';
	import { useI18n } from '$lib/i18n';
	import LabelsTab from '../tabs/labels-tab.svelte';

	const { t } = useI18n();

	watch(
		() => app.account.isAdmin,
		(isAdmin) => {
			if (!isAdmin) {
				app.toast.error(t('You do not have access to this page.'));
				void goto('/admin/notifications');
			}
		}
	);
</script>

{#if app.account.isAdmin}
	<LabelsTab />
{/if}
