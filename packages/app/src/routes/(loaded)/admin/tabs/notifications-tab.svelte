<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { DataTable, type ColumnDef } from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox, Input, Textarea } from '$lib/components/ui/input';
	import { app } from '$core/app/context';
	import { pocketbase } from '$core/pocketbase';
	import { fetch } from '$core/http/fetch';
	import type { NotificationRecord } from '$core/app/database/notifications';
	import type { UsersResponse } from '$core/pocketbase/types';
	import dayjs from '$lib/dayjs';
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import { cn } from '$lib/utils';
	import { interactive } from '$lib/components/ui/variants';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	const sentColumns: ColumnDef<NotificationRecord>[] = [
		{
			id: 'title',
			header: t('Title'),
			width: 'w-5/24',
			accessor: (notification) => notification.title,
			class: 'truncate font-medium'
		},
		{
			id: 'body',
			header: t('Message'),
			width: 'w-10/24',
			accessor: (notification) => notification.body,
			class: 'text-secondary-400 truncate text-sm'
		},
		{
			id: 'recipients',
			header: t('Recipients'),
			width: 'w-5/24',
			class: 'text-secondary-400 truncate text-sm'
		},
		{
			id: 'created',
			header: t('Sent'),
			width: 'w-4/24',
			class: 'text-secondary-500 text-sm whitespace-nowrap'
		}
	];

	let title = $state('');
	let body = $state('');
	let targetAll = $state(false);
	let userQuery = $state('');
	let selectedUsers = $state<UsersResponse[]>([]);
	let searchResults = $state<UsersResponse[]>([]);
	let sentNotifications = $state<NotificationRecord[]>([]);
	let isSubmitting = $state(false);
	let isSearching = $state(false);

	$effect(() => {
		if (app.account.isStaff) {
			void loadSent();
		}
	});

	const loadSent = async () => {
		sentNotifications = await app.database.notifications.listAll(50);
	};

	const userLabel = (user: UsersResponse) => user.name || user.email || user.id;

	const searchUsers = async () => {
		const query = userQuery.trim();

		if (query.length < 2) {
			searchResults = [];
			return;
		}

		isSearching = true;

		try {
			const escaped = query.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
			const response = await pocketbase.collection('users').getList<UsersResponse>(1, 10, {
				filter: `name ~ "${escaped}" || email ~ "${escaped}"`,
				sort: 'name',
				fetch
			});

			searchResults = response.items.filter(
				(user) => !selectedUsers.some((selected) => selected.id === user.id)
			);
		} finally {
			isSearching = false;
		}
	};

	const addUser = (user: UsersResponse) => {
		selectedUsers = [...selectedUsers, user];
		searchResults = searchResults.filter((result) => result.id !== user.id);
		userQuery = '';
	};

	const removeUser = (userId: string) => {
		selectedUsers = selectedUsers.filter((user) => user.id !== userId);
	};

	const submit = async () => {
		if (!title.trim() || !body.trim()) {
			app.toast.error(t('Enter a title and message.'));
			return;
		}

		if (!targetAll && selectedUsers.length === 0) {
			app.toast.error(t('Select at least one recipient or choose all users.'));
			return;
		}

		isSubmitting = true;

		try {
			await app.database.notifications.create({
				title: title.trim(),
				body: body.trim(),
				targetAll,
				recipients: targetAll ? [] : selectedUsers.map((user) => user.id)
			});

			app.toast.success(t('Notification sent.'));
			title = '';
			body = '';
			targetAll = false;
			selectedUsers = [];
			searchResults = [];
			userQuery = '';
			await loadSent();
		} catch (error) {
			console.error('[NOTIFICATIONS]: create failed:', error);
			app.toast.error(t('Could not send notification.'));
		} finally {
			isSubmitting = false;
		}
	};
</script>

<Form.Root class="space-y-0">
	<div class="border-secondary-800 grid gap-4 border-b p-4 lg:grid-cols-2">
		<Form.Group class="mb-0">
			<Form.Label>{t('Title')}</Form.Label>
			<Form.Description>{t('Short title that appears in the notification list.')}</Form.Description>
			<Input bind:value={title} placeholder={t('Title')} maxlength={200} />
		</Form.Group>

		<Form.Group class="mb-0 lg:col-span-2">
			<Form.Label>{t('Message')}</Form.Label>
			<Form.Description>
				{t('Full content in the modal. Markdown is supported (headings, lists, links, bold, italic).')}
			</Form.Description>
			<Textarea bind:value={body} rows={5} maxlength={10000} placeholder={t('Write your message...')} />
		</Form.Group>
	</div>

	<div class="border-secondary-800 border-b p-4">
		<Form.Group class="mb-0">
			<Checkbox label={t('Send to all users')} bind:checked={targetAll} />
		</Form.Group>

		{#if !targetAll}
			<Form.Group class="mb-0 mt-4">
				<Form.Label>{t('Recipients')}</Form.Label>
				<Form.Description>{t('Search users by name or email and add them.')}</Form.Description>
				<div class="flex gap-2">
					<Input
						bind:value={userQuery}
						placeholder={t('Search by name or email...')}
						onkeydown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								void searchUsers();
							}
						}}
					/>
					<Button type="button" variant="secondary" onclick={() => searchUsers()} loading={isSearching}>
						{t('Search')}
					</Button>
				</div>

				{#if searchResults.length > 0}
					<div
						class="border-secondary-800 divide-secondary-800 mt-3 divide-y overflow-hidden rounded-md border"
					>
						{#each searchResults as user (user.id)}
							<button
								type="button"
								class={cn(
									interactive,
									'hover:bg-secondary-950/50 flex w-full flex-col px-4 py-2.5 text-left text-sm transition-colors'
								)}
								onclick={() => addUser(user)}
							>
								<span class="font-medium">{userLabel(user)}</span>
								{#if user.name && user.email}
									<span class="text-secondary-400 text-xs">{user.email}</span>
								{/if}
							</button>
						{/each}
					</div>
				{/if}

				{#if selectedUsers.length > 0}
					<div class="mt-3 flex flex-wrap gap-2">
						{#each selectedUsers as user (user.id)}
							<Badge class="inline-flex items-center gap-2">
								{userLabel(user)}
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									class="text-secondary-400 hover:text-white"
									onclick={() => removeUser(user.id)}
									aria-label={t('Remove {name}', { name: userLabel(user) })}
								>
									<XIcon size={14} />
								</Button>
							</Badge>
						{/each}
					</div>
				{/if}
			</Form.Group>
		{/if}
	</div>

	<div class="border-secondary-800 border-b p-4">
		<Button type="button" class="w-fit" onclick={() => submit()} loading={isSubmitting}>
			{t('Send')}
		</Button>
	</div>
</Form.Root>

<section>
	<div class="border-secondary-800 border-b px-4 py-3">
		<p class="text-secondary-300 text-xs font-semibold tracking-wide uppercase">
			{t('Sent notifications')}
		</p>
	</div>

	{#if sentNotifications.length === 0}
		<p class="text-secondary-400 px-4 py-6 text-sm">{t('No notifications sent yet.')}</p>
	{:else}
		{#snippet cell_recipients({ row }: { row: NotificationRecord })}
			{row.targetAll ? t('All users') : t('{count} recipient(s)', { count: row.recipients?.length ?? 0 })}
		{/snippet}
		{#snippet cell_created({ row }: { row: NotificationRecord })}
			{dayjs(row.created).format('D MMM YYYY HH:mm')}
		{/snippet}
		<DataTable
			data={sentNotifications}
			columns={sentColumns}
			rowKey={(notification) => notification.id}
			class="rounded-none border-0"
			cells={{ recipients: cell_recipients, created: cell_created }}
		/>
	{/if}
</section>
