<script lang="ts">
	import { confirm } from '@tauri-apps/plugin-dialog';
	import { DataTable, type ColumnDef } from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input, Checkbox } from '$lib/components/ui/input';
	import * as Form from '$lib/components/ui/form';
	import { app } from '$core/app/context';
	import { pocketbase } from '$core/pocketbase';
	import { fetch } from '$core/http/fetch';
	import type {
		AntiCheatProcessDenylistResponse,
		AntiCheatProcessHitsResponse,
		UsersResponse
	} from '$core/pocketbase/types';
	import dayjs from '$lib/dayjs';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	type HitRow = AntiCheatProcessHitsResponse<{ user?: UsersResponse }>;

	const denylistColumns: ColumnDef<AntiCheatProcessDenylistResponse>[] = [
		{ id: 'name', header: t('Process name'), width: 'w-8/24', class: 'font-medium' },
		{ id: 'label', header: t('Label'), width: 'w-6/24', class: 'text-secondary-400 text-sm' },
		{
			id: 'enabled',
			header: t('Enabled'),
			width: 'w-3/24',
			headerClass: 'text-center',
			class: 'text-center'
		},
		{ id: 'actions', header: '', width: 'w-7/24', class: 'text-right' }
	];

	const hitColumns: ColumnDef<HitRow>[] = [
		{ id: 'user', header: t('Player'), width: 'w-5/24', class: 'font-medium' },
		{ id: 'process', header: t('Process name'), width: 'w-6/24' },
		{
			id: 'session',
			header: t('Session'),
			width: 'w-5/24',
			class: 'text-secondary-500 text-sm tabular-nums'
		},
		{
			id: 'detected',
			header: t('Detected'),
			width: 'w-8/24',
			class: 'text-secondary-500 text-sm tabular-nums'
		}
	];

	let name = $state('');
	let label = $state('');
	let enabled = $state(true);
	let denylist = $state<AntiCheatProcessDenylistResponse[]>([]);
	let hits = $state<HitRow[]>([]);
	let isSaving = $state(false);
	let deletingId = $state<string | null>(null);
	let togglingId = $state<string | null>(null);

	$effect(() => {
		if (app.account.isStaff) {
			void loadDenylist();
			void loadHits();
		}
	});

	const userLabel = (hit: HitRow) => {
		const user = hit.expand?.user;
		return user?.name || user?.email || hit.user;
	};

	const loadDenylist = async () => {
		try {
			denylist = await pocketbase
				.collection('anti_cheat_process_denylist')
				.getFullList<AntiCheatProcessDenylistResponse>({
					sort: 'name',
					fetch
				});
		} catch (error) {
			console.error('[ADMIN]: denylist load failed:', error);
			app.toast.error(t('Could not load denylist.'));
		}
	};

	const loadHits = async () => {
		try {
			const response = await pocketbase
				.collection('anti_cheat_process_hits')
				.getList<HitRow>(1, 50, {
					sort: '-detected_at',
					expand: 'user',
					fetch
				});
			hits = response.items;
		} catch (error) {
			console.error('[ADMIN]: process hits load failed:', error);
			app.toast.error(t('Could not load process hits.'));
		}
	};

	const addProcess = async () => {
		const processName = name.trim();
		if (!processName) {
			return;
		}

		isSaving = true;
		try {
			await pocketbase.collection('anti_cheat_process_denylist').create(
				{
					name: processName,
					label: label.trim() || processName,
					enabled
				},
				{ fetch }
			);
			name = '';
			label = '';
			enabled = true;
			app.toast.success(t('Process added.'));
			await loadDenylist();
		} catch (error) {
			console.error('[ADMIN]: denylist create failed:', error);
			app.toast.error(t('Could not save process.'));
		} finally {
			isSaving = false;
		}
	};

	const toggleEnabled = async (entry: AntiCheatProcessDenylistResponse) => {
		togglingId = entry.id;
		try {
			await pocketbase
				.collection('anti_cheat_process_denylist')
				.update(entry.id, { enabled: entry.enabled === false }, { fetch });
			await loadDenylist();
		} catch (error) {
			console.error('[ADMIN]: denylist update failed:', error);
			app.toast.error(t('Could not save process.'));
		} finally {
			togglingId = null;
		}
	};

	const removeProcess = async (entry: AntiCheatProcessDenylistResponse) => {
		const confirmed = await confirm(t('Remove {name} from the denylist?', { name: entry.name }), {
			okLabel: t('Delete'),
			cancelLabel: t('Cancel'),
			kind: 'warning'
		});
		if (!confirmed) {
			return;
		}

		deletingId = entry.id;
		try {
			await pocketbase.collection('anti_cheat_process_denylist').delete(entry.id, { fetch });
			app.toast.success(t('Process removed.'));
			await loadDenylist();
		} catch (error) {
			console.error('[ADMIN]: denylist delete failed:', error);
			app.toast.error(t('Could not delete process.'));
		} finally {
			deletingId = null;
		}
	};
</script>

<Form.Root class="space-y-0">
	<div class="border-secondary-800 border-b p-4">
		<div class="grid max-w-4xl gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
			<Form.Group class="mb-0">
				<Form.Label>{t('Process name')}</Form.Label>
				<Input
					bind:value={name}
					placeholder="cheatengine"
					onkeydown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							void addProcess();
						}
					}}
				/>
			</Form.Group>
			<Form.Group class="mb-0">
				<Form.Label>{t('Label')}</Form.Label>
				<Input bind:value={label} placeholder={t('Optional display name')} />
			</Form.Group>
			<Form.Group class="mb-0">
				<span class="invisible select-none" aria-hidden="true">
					<Form.Label>&nbsp;</Form.Label>
				</span>
				<div class="flex h-11 items-center gap-3">
					<Checkbox bind:checked={enabled} label={t('Enabled')} size="sm" />
					<Button type="button" class="shrink-0" loading={isSaving} onclick={() => addProcess()}>
						{t('Add process')}
					</Button>
				</div>
			</Form.Group>
		</div>
	</div>
</Form.Root>

<section>
	<div class="border-secondary-800 border-b px-4 py-3">
		<p class="text-secondary-300 text-xs font-semibold tracking-wide uppercase">
			{t('Processes')}
		</p>
	</div>
	{#snippet cell_name({ row }: { row: AntiCheatProcessDenylistResponse })}
		<span class="truncate">{row.name}</span>
	{/snippet}
	{#snippet cell_label({ row }: { row: AntiCheatProcessDenylistResponse })}
		<span class="truncate">{row.label || '—'}</span>
	{/snippet}
	{#snippet cell_enabled({ row }: { row: AntiCheatProcessDenylistResponse })}
		<div class="flex justify-center">
			<Badge variant={row.enabled === false ? 'default' : 'success'}>
				{row.enabled === false ? t('Off') : t('On')}
			</Badge>
		</div>
	{/snippet}
	{#snippet cell_actions({ row }: { row: AntiCheatProcessDenylistResponse })}
		<div class="flex justify-end gap-2">
			<Button
				type="button"
				size="sm"
				variant="secondary"
				loading={togglingId === row.id}
				onclick={() => toggleEnabled(row)}
			>
				{row.enabled === false ? t('Enable') : t('Disable')}
			</Button>
			<Button
				type="button"
				size="sm"
				variant="destructive"
				loading={deletingId === row.id}
				onclick={() => removeProcess(row)}
			>
				{t('Delete')}
			</Button>
		</div>
	{/snippet}
	<DataTable
		data={denylist}
		columns={denylistColumns}
		rowKey={(entry) => entry.id}
		empty={t('No denylist entries yet.')}
		class="rounded-none border-0"
		cells={{
			name: cell_name,
			label: cell_label,
			enabled: cell_enabled,
			actions: cell_actions
		}}
	/>
</section>

<section>
	<div class="border-secondary-800 border-t border-b px-4 py-3">
		<p class="text-secondary-300 text-xs font-semibold tracking-wide uppercase">
			{t('Process hits')}
		</p>
	</div>
	{#snippet cell_user({ row }: { row: HitRow })}
		<span class="block truncate">{userLabel(row)}</span>
	{/snippet}
	{#snippet cell_process({ row }: { row: HitRow })}
		<span class="block truncate">{row.process_name}</span>
	{/snippet}
	{#snippet cell_session({ row }: { row: HitRow })}
		{row.session_id ?? '—'}
	{/snippet}
	{#snippet cell_detected({ row }: { row: HitRow })}
		{dayjs(row.detected_at || row.created).format('D MMM YYYY HH:mm')}
	{/snippet}
	<DataTable
		data={hits}
		columns={hitColumns}
		rowKey={(hit) => hit.id}
		empty={t('No process hits yet.')}
		class="rounded-none border-0"
		cells={{
			user: cell_user,
			process: cell_process,
			session: cell_session,
			detected: cell_detected
		}}
	/>
</section>
