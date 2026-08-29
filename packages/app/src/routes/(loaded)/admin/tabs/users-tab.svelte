<script lang="ts">
	import { goto } from '$app/navigation';
	import { confirm } from '@tauri-apps/plugin-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import * as Form from '$lib/components/ui/form';
	import * as Dropdown from '$lib/components/ui/dropdown';
	import { DataTable, type ColumnDef } from '$lib/components/ui/table';
	import * as User from '$lib/components/user';
	import { app } from '$core/app/context';
	import { pocketbase } from '$core/pocketbase';
	import { fetch } from '$core/http/fetch';
	import { UsersRoleOptions, type UsersResponse } from '$core/pocketbase/types';
	import {
		assignUserLabel,
		labelsByUserId,
		listAssignmentsForUsers,
		listUserLabels,
		unassignUserLabel,
		type UserLabel,
		type UserLabelAssignment
	} from '$core/pocketbase/user-labels';
	import { ClientResponseError } from 'pocketbase';
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	const columns: ColumnDef<UsersResponse>[] = [
		{ id: 'user', header: t('User'), width: 'w-14/24' },
		{ id: 'actions', header: '', width: 'w-10/24', class: 'text-right' }
	];

	let userQuery = $state('');
	let searchResults = $state.raw<UsersResponse[]>([]);
	let catalog = $state.raw<UserLabel[]>([]);
	let assignments = $state.raw<UserLabelAssignment[]>([]);
	let isSearching = $state(false);
	let impersonatingId = $state<string | null>(null);
	let togglingKey = $state<string | null>(null);
	let searched = $state(false);
	const labelsByUser = $derived(labelsByUserId(assignments));

	$effect(() => {
		if (app.account.isAdmin) {
			void loadCatalog();
		}
	});

	const userLabel = (user: UsersResponse) => user.name || user.email || user.id;

	const roleLabel = (role: UsersResponse['role']) => {
		if (role === UsersRoleOptions.admin) return t('Admin');
		if (role === UsersRoleOptions.moderator) return t('Moderator');
		return '';
	};

	const recordId = (value: unknown) => {
		if (!value) return '';
		if (typeof value === 'object' && 'id' in value) return String((value as { id: string }).id);
		return String(value);
	};

	const loadCatalog = async () => {
		try {
			catalog = await listUserLabels();
		} catch (error) {
			console.error('[ADMIN]: user labels catalog failed:', error);
			app.toast.error(t('Could not load labels.'));
		}
	};

	const loadAssignments = async (userIds: string[]) => {
		try {
			assignments = await listAssignmentsForUsers(userIds);
		} catch (error) {
			console.error('[ADMIN]: user label assignments failed:', error);
			app.toast.error(t('Could not load user labels.'));
		}
	};

	const searchUsers = async () => {
		const query = userQuery.trim();
		if (query.length < 2) {
			searchResults = [];
			assignments = [];
			searched = false;
			return;
		}
		isSearching = true;
		try {
			const escaped = query.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
			const response = await pocketbase.collection('users').getList<UsersResponse>(1, 20, {
				filter: `name ~ "${escaped}" || email ~ "${escaped}"`,
				sort: 'name',
				fetch
			});
			searchResults = response.items;
			searched = true;
			await loadAssignments(response.items.map((user) => user.id));
		} catch (error) {
			console.error('[ADMIN]: user search failed:', error);
			app.toast.error(t('Could not search users.'));
		} finally {
			isSearching = false;
		}
	};

	const assignmentFor = (userId: string, labelId: string) =>
		assignments.find((row) => recordId(row.user) === userId && recordId(row.label) === labelId);

	const toggleLabel = async (user: UsersResponse, label: UserLabel) => {
		const key = `${user.id}:${label.id}`;
		togglingKey = key;
		try {
			const existing = assignmentFor(user.id, label.id);
			if (existing) {
				await unassignUserLabel(existing.id);
			} else {
				await assignUserLabel(user.id, label.id);
			}
			await loadAssignments(searchResults.map((item) => item.id));
		} catch (error) {
			console.error('[ADMIN]: user label toggle failed:', error);
			app.toast.error(t('Could not update labels.'));
		} finally {
			togglingKey = null;
		}
	};

	const loginAs = async (user: UsersResponse) => {
		if (user.id === app.account.userId) {
			return;
		}
		const confirmed = await confirm(
			t('You will be signed in as {name}. You can return to your own account at any time.', {
				name: userLabel(user)
			}),
			{ okLabel: t('Login as user'), cancelLabel: t('Cancel'), kind: 'warning' }
		);
		if (!confirmed) {
			return;
		}
		impersonatingId = user.id;
		try {
			await app.account.impersonate(user.id);
			app.toast.success(t('Signed in as {name}.', { name: userLabel(user) }));
			void goto('/');
		} catch (error) {
			console.error('[ADMIN]: impersonate failed:', error);
			const message =
				error instanceof ClientResponseError
					? (typeof error.response?.message === 'string' && error.response.message) ||
						error.message
					: error instanceof Error
						? error.message
						: t('Could not sign in as this user');
			app.toast.error(message);
		} finally {
			impersonatingId = null;
		}
	};
</script>

<Form.Root class="space-y-0">
	<div class="border-secondary-800 border-b p-4">
		<Form.Group class="mb-0 max-w-3xl">
			<Form.Label>{t('Find a user')}</Form.Label>
			<Form.Description>
				{t('Search by name or email, then assign labels or sign in as that account.')}
			</Form.Description>
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
		</Form.Group>
	</div>
</Form.Root>

{#if searched && searchResults.length === 0}
	<p class="text-secondary-400 px-4 py-6 text-sm">{t('No users found.')}</p>
{:else if searchResults.length > 0}
	{#snippet cell_user({ row }: { row: UsersResponse })}
		<User.Root user={row} class="flex min-w-0 flex-col">
			<span class="flex min-w-0 flex-wrap items-center gap-2">
				{#if row.name}
					<User.Name class="truncate font-medium" />
				{:else}
					<span class="truncate font-medium">{row.email || row.id}</span>
				{/if}
				{#if roleLabel(row.role)}
					<Badge variant="primary">{roleLabel(row.role)}</Badge>
				{/if}
				<User.Labels labels={labelsByUser[row.id] ?? []} />
			</span>
			{#if row.name && row.email}
				<span class="text-secondary-400 text-xs">{row.email}</span>
			{/if}
		</User.Root>
	{/snippet}
	{#snippet cell_actions({ row }: { row: UsersResponse })}
		<div class="flex justify-end gap-2">
			<Dropdown.Root>
				{#snippet trigger({ props })}
					<Button {...props} type="button" variant="secondary" size="sm">
						{t('Edit labels')}
					</Button>
				{/snippet}
				{#if catalog.length === 0}
					<div class="text-secondary-400 px-3 py-2 text-sm">{t('No labels yet.')}</div>
				{:else}
					{#each catalog as label (label.id)}
						<Dropdown.Item
							class="flex items-center gap-2"
							disabled={togglingKey === `${row.id}:${label.id}`}
							onclick={() => toggleLabel(row, label)}
						>
							<span class="flex h-4 w-4 shrink-0 items-center justify-center">
								{#if assignmentFor(row.id, label.id)}
									<CheckIcon class="size-4" weight="bold" />
								{/if}
							</span>
							{label.name}
						</Dropdown.Item>
					{/each}
				{/if}
			</Dropdown.Root>
			<Button
				type="button"
				variant="secondary"
				size="sm"
				disabled={row.id === app.account.userId}
				loading={impersonatingId === row.id}
				onclick={() => loginAs(row)}
			>
				{t('Login as')}
			</Button>
		</div>
	{/snippet}
	<DataTable
		data={searchResults}
		{columns}
		rowKey={(user) => user.id}
		class="rounded-none border-0"
		cells={{ user: cell_user, actions: cell_actions }}
	/>
{/if}
