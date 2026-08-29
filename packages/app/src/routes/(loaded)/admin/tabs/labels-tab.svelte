<script lang="ts">
	import { confirm } from '@tauri-apps/plugin-dialog';
	import { DataTable, type ColumnDef } from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input, Select } from '$lib/components/ui/input';
	import * as Form from '$lib/components/ui/form';
	import { app } from '$core/app/context';
	import { pocketbase } from '$core/pocketbase';
	import { fetch } from '$core/http/fetch';
	import {
		labelColor,
		listUserLabels,
		userLabelColors,
		type UserLabel
	} from '$core/pocketbase/user-labels';
	import type { Create, Update, UserLabelsColorOptions } from '$core/pocketbase/types';
	import { useI18n } from '$lib/i18n';
	import { watch } from 'runed';

	const { t } = useI18n();

	const colorItems = $derived(
		userLabelColors.map((value) => ({
			value,
			label: colorLabel(value)
		}))
	);

	const columns: ColumnDef<UserLabel>[] = [
		{ id: 'name', header: t('Name'), width: 'w-8/24' },
		{ id: 'color', header: t('Color'), width: 'w-6/24' },
		{ id: 'sort', header: t('Sort'), width: 'w-3/24', class: 'tabular-nums' },
		{ id: 'actions', header: '', width: 'w-7/24', class: 'text-right' }
	];

	let name = $state('');
	let color = $state<UserLabelsColorOptions>('primary');
	let sort = $state('0');
	let labels = $state.raw<UserLabel[]>([]);
	let isSaving = $state(false);
	let deletingId = $state<string | null>(null);
	let editingId = $state<string | null>(null);

	watch(
		() => app.account.isAdmin,
		(isAdmin) => {
			if (isAdmin) void loadLabels();
		}
	);

	function colorLabel(value: UserLabelsColorOptions) {
		if (value === 'primary') return t('Primary');
		if (value === 'default') return t('Default');
		if (value === 'warning') return t('Warning');
		if (value === 'success') return t('Success');
		if (value === 'info') return t('Info');
		return t('Destructive');
	}

	function resetForm() {
		name = '';
		color = 'primary';
		sort = '0';
		editingId = null;
	}

	async function loadLabels() {
		try {
			labels = await listUserLabels();
		} catch (error) {
			console.error('[ADMIN]: user labels load failed:', error);
			app.toast.error(t('Could not load labels.'));
		}
	}

	const startEdit = (label: UserLabel) => {
		editingId = label.id;
		name = label.name;
		color = label.color;
		sort = String(label.sort ?? 0);
	};

	const saveLabel = async () => {
		const trimmed = name.trim();
		if (!trimmed) return;
		isSaving = true;
		try {
			if (editingId) {
				const data: Update<'user_labels'> = { name: trimmed, color, sort: Number(sort) || 0 };
				await pocketbase.collection('user_labels').update(editingId, data, { fetch });
				app.toast.success(t('Label updated.'));
			} else {
				const data: Create<'user_labels'> = {
					name: trimmed,
					color,
					sort: Number(sort) || 0
				};
				await pocketbase.collection('user_labels').create(data, { fetch });
				app.toast.success(t('Label created.'));
			}
			resetForm();
			await loadLabels();
		} catch (error) {
			console.error('[ADMIN]: user label save failed:', error);
			app.toast.error(t('Could not save label.'));
		} finally {
			isSaving = false;
		}
	};

	const removeLabel = async (label: UserLabel) => {
		const confirmed = await confirm(
			t('Delete {name}? This removes it from every assigned user.', { name: label.name }),
			{ okLabel: t('Delete'), cancelLabel: t('Cancel'), kind: 'warning' }
		);
		if (!confirmed) return;
		deletingId = label.id;
		try {
			await pocketbase.collection('user_labels').delete(label.id, { fetch });
			if (editingId === label.id) resetForm();
			app.toast.success(t('Label deleted.'));
			await loadLabels();
		} catch (error) {
			console.error('[ADMIN]: user label delete failed:', error);
			app.toast.error(t('Could not delete label.'));
		} finally {
			deletingId = null;
		}
	};
</script>

<Form.Root class="space-y-0">
	<div class="border-secondary-800 border-b p-4">
		<Form.Group class="mb-3 max-w-3xl">
			<Form.Label>{t('User labels')}</Form.Label>
			<Form.Description>
				{t('Create labels such as Premium, Streamer, or Legend, then assign them from the Users tab.')}
			</Form.Description>
		</Form.Group>
		<div class="grid max-w-4xl gap-3 md:grid-cols-[minmax(0,1fr)_minmax(10rem,12rem)_5rem_auto] md:items-end">
			<Form.Group class="mb-0">
				<Form.Label>{t('Name')}</Form.Label>
				<Input
					bind:value={name}
					placeholder={t('Premium')}
					onkeydown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							void saveLabel();
						}
					}}
				/>
			</Form.Group>
			<Form.Group class="mb-0">
				<Form.Label>{t('Color')}</Form.Label>
				<Select type="single" bind:value={color} items={colorItems} placeholder={t('Color')} />
			</Form.Group>
			<Form.Group class="mb-0">
				<Form.Label>{t('Sort')}</Form.Label>
				<Input type="number" min={0} bind:value={sort} />
			</Form.Group>
			<Form.Group class="mb-0">
				<div class="flex h-11 items-center gap-2">
					<Button type="button" class="shrink-0" loading={isSaving} onclick={() => saveLabel()}>
						{editingId ? t('Save label') : t('Add label')}
					</Button>
					{#if editingId}
						<Button type="button" variant="secondary" onclick={resetForm}>{t('Cancel')}</Button>
					{/if}
				</div>
			</Form.Group>
		</div>
	</div>
</Form.Root>

{#snippet cell_name({ row }: { row: UserLabel })}
	<span class="truncate font-medium">{row.name}</span>
{/snippet}
{#snippet cell_color({ row }: { row: UserLabel })}
	<Badge variant={labelColor(row.color)}>{colorLabel(row.color)}</Badge>
{/snippet}
{#snippet cell_sort({ row }: { row: UserLabel })}
	{row.sort ?? 0}
{/snippet}
{#snippet cell_actions({ row }: { row: UserLabel })}
	<div class="flex justify-end gap-2">
		<Button type="button" size="sm" variant="secondary" onclick={() => startEdit(row)}>
			{t('Edit')}
		</Button>
		<Button
			type="button"
			size="sm"
			variant="destructive"
			loading={deletingId === row.id}
			onclick={() => removeLabel(row)}
		>
			{t('Delete')}
		</Button>
	</div>
{/snippet}
<DataTable
	data={labels}
	{columns}
	rowKey={(label) => label.id}
	empty={t('No labels yet.')}
	class="rounded-none border-0"
	cells={{
		name: cell_name,
		color: cell_color,
		sort: cell_sort,
		actions: cell_actions
	}}
/>
