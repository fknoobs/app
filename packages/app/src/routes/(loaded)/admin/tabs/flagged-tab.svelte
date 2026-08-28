<script lang="ts">
	import { confirm } from '@tauri-apps/plugin-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import CaptureImage from '$lib/components/anti-cheat/capture-image.svelte';
	import { interactive, tabTrigger, type SemanticVariant } from '$lib/components/ui/variants';
	import { app } from '$core/app/context';
	import { pocketbase } from '$core/pocketbase';
	import { fetch } from '$core/http/fetch';
	import {
		findCheaterBySteamId,
		listCapturesForUserSession,
		type CaptureRecord
	} from '$core/pocketbase/anti-cheat';
	import {
		AntiCheatReportsStatusOptions,
		type AntiCheatReportsResponse,
		type UsersResponse
	} from '$core/pocketbase/types';
	import { ClientResponseError } from 'pocketbase';
	import { resource } from 'runed';
	import { relic } from '$lib/relic';
	import { cn } from '$lib/utils';
	import dayjs from '$lib/dayjs';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	type StatusFilter = 'all' | AntiCheatReportsStatusOptions;
	type ReportUser = UsersResponse<Record<string, unknown>, string[]>;
	type ReportRow = AntiCheatReportsResponse<{
		accused?: ReportUser;
		reporter?: ReportUser;
	}>;

	const statusFilters: { id: StatusFilter; label: string }[] = [
		{ id: 'all', label: t('All') },
		{ id: AntiCheatReportsStatusOptions.pending, label: t('Pending') },
		{ id: AntiCheatReportsStatusOptions.confirmed, label: t('Confirmed') },
		{ id: AntiCheatReportsStatusOptions.dismissed, label: t('Dismissed') }
	];

	let statusFilter = $state<StatusFilter>('pending');
	let selectedId = $state<string | null>(null);
	let updatingId = $state<string | null>(null);

	const loadReports = async (status: StatusFilter): Promise<ReportRow[]> => {
		try {
			const response = await pocketbase.collection('anti_cheat_reports').getList<ReportRow>(1, 50, {
				...(status === 'all' ? {} : { filter: `status = "${status}"` }),
				sort: '-created',
				expand: 'accused,reporter',
				fetch
			});
			return response.items;
		} catch (error) {
			console.error('[ADMIN]: reports load failed:', error);
			app.toast.error(t('Could not load flagged players.'));
			return [];
		}
	};

	const reports = resource(
		() => (app.account.isStaff ? statusFilter : null),
		async (status) => (status ? loadReports(status) : [])
	);

	const selected = $derived(
		reports.current?.find((report) => report.id === selectedId) ?? reports.current?.[0] ?? null
	);

	const aliasBySteamId = resource(
		() => {
			const ids = (reports.current ?? []).flatMap((report) => [
				report.accused_steam_id,
				...steamIdsOf(report.expand?.accused),
				...steamIdsOf(report.expand?.reporter)
			]);
			return [...new Set(ids.filter(Boolean))].join(',');
		},
		async (key) => {
			const ids = key ? key.split(',') : [];
			const entries = await Promise.all(
				ids.map(async (id) => {
					try {
						const profile = await relic.getProfileBySteamId(id);
						return profile?.alias ? ([id, profile.alias] as const) : null;
					} catch {
						return null;
					}
				})
			);
			return Object.fromEntries(entries.filter((entry) => entry !== null));
		}
	);

	const captures = resource(
		() => (selected ? `${selected.accused}:${selected.session_id}` : null),
		async () => {
			if (!selected) return [] as CaptureRecord[];
			try {
				return await listCapturesForUserSession(selected.accused, selected.session_id);
			} catch (error) {
				console.error('[ADMIN]: report captures load failed:', error);
				return [];
			}
		}
	);

	const statusLabel = (status: AntiCheatReportsStatusOptions) => {
		if (status === 'pending') return t('Pending');
		if (status === 'confirmed') return t('Confirmed');
		return t('Dismissed');
	};

	const statusVariant = (status: AntiCheatReportsStatusOptions): SemanticVariant => {
		if (status === 'confirmed') return 'destructive';
		if (status === 'pending') return 'warning';
		return 'default';
	};

	function steamIdsOf(user: ReportUser | undefined): string[] {
		if (!Array.isArray(user?.steamIds)) return [];
		return user.steamIds.map((id) => String(id)).filter(Boolean);
	}

	function relicAlias(steamId: string | undefined): string | undefined {
		if (!steamId) return undefined;
		return aliasBySteamId.current?.[steamId];
	}

	const accusedSteamId = (report: ReportRow) =>
		report.accused_steam_id || steamIdsOf(report.expand?.accused)[0] || '';

	const accusedLabel = (report: ReportRow) =>
		relicAlias(accusedSteamId(report)) || accusedSteamId(report) || report.accused;

	const reporterLabel = (report: ReportRow) => {
		const steamId = steamIdsOf(report.expand?.reporter)[0];
		return relicAlias(steamId) || steamId || report.reporter;
	};

	const reloadReports = async () => {
		reports.mutate(await loadReports(statusFilter));
	};

	const setStatus = async (report: ReportRow, status: AntiCheatReportsStatusOptions) => {
		updatingId = report.id;
		try {
			await pocketbase.collection('anti_cheat_reports').update(report.id, { status }, { fetch });
			await reloadReports();
		} catch (error) {
			console.error('[ADMIN]: report update failed:', error);
			app.toast.error(t('Could not update report.'));
		} finally {
			updatingId = null;
		}
	};

	const markCheater = async (report: ReportRow) => {
		if (!report.accused_steam_id) {
			app.toast.error(t('This report has no Steam ID.'));
			return;
		}

		const confirmed = await confirm(
			t('Mark this player as a cheater? They will get a cheater label, not a ban.'),
			{ okLabel: t('Mark as cheater'), cancelLabel: t('Cancel'), kind: 'warning' }
		);
		if (!confirmed) return;

		updatingId = report.id;
		try {
			const existing = await findCheaterBySteamId(report.accused_steam_id);
			if (!existing) {
				await pocketbase.collection('anti_cheat_cheaters').create(
					{
						user: report.accused,
						steam_id: report.accused_steam_id,
						labeled_by: app.account.userId
					},
					{ fetch }
				);
			}
			await pocketbase
				.collection('anti_cheat_reports')
				.update(report.id, { status: AntiCheatReportsStatusOptions.confirmed }, { fetch });
			app.toast.success(t('Player marked as a cheater.'));
			await reloadReports();
		} catch (error) {
			if (error instanceof ClientResponseError && error.status === 400) {
				await pocketbase
					.collection('anti_cheat_reports')
					.update(report.id, { status: AntiCheatReportsStatusOptions.confirmed }, { fetch });
				await reloadReports();
			} else {
				console.error('[ADMIN]: mark cheater failed:', error);
				app.toast.error(t('Could not mark player as a cheater.'));
			}
		} finally {
			updatingId = null;
		}
	};

	const removeCheater = async (report: ReportRow) => {
		if (!report.accused_steam_id) return;
		const confirmed = await confirm(t('Remove the cheater label from this player?'), {
			okLabel: t('Remove cheater label'),
			cancelLabel: t('Cancel'),
			kind: 'warning'
		});
		if (!confirmed) return;

		updatingId = report.id;
		try {
			const existing = await findCheaterBySteamId(report.accused_steam_id);
			if (existing) {
				await pocketbase.collection('anti_cheat_cheaters').delete(existing.id, { fetch });
			}
			app.toast.success(t('Cheater label removed.'));
		} catch (error) {
			console.error('[ADMIN]: remove cheater failed:', error);
			app.toast.error(t('Could not remove cheater label.'));
		} finally {
			updatingId = null;
		}
	};

	function openCapture(capture: CaptureRecord) {
		app.modal.create({
			component: CaptureImage,
			title: t('Screenshot'),
			description: dayjs(capture.captured_at || capture.created).format('D MMM YYYY HH:mm'),
			props: {
				capture,
				class: 'border-secondary-800 max-h-[75vh] w-full rounded-md border object-contain'
			},
			size: 'xl'
		});
		app.modal.open();
	}
</script>

<div class="border-secondary-800 flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
	{#each statusFilters as filter (filter.id)}
		<button
			type="button"
			class={tabTrigger}
			data-state={statusFilter === filter.id ? 'active' : undefined}
			onclick={() => {
				statusFilter = filter.id;
				selectedId = null;
			}}
		>
			{filter.label}
		</button>
	{/each}
</div>

{#if reports.loading && (reports.current?.length ?? 0) === 0}
	<div class="grid min-h-0 grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
		<div class="border-secondary-800 divide-secondary-800 divide-y border-r">
			{#each [0, 1, 2] as row (row)}
				<div class="flex flex-col gap-1.5 px-4 py-3">
					<Skeleton class="h-3.5 w-28" />
					<Skeleton class="h-3 w-20" />
				</div>
			{/each}
		</div>
		<div class="p-4">
			<Skeleton class="h-40 w-full rounded-md" />
		</div>
	</div>
{:else if (reports.current?.length ?? 0) === 0}
	<p class="text-secondary-400 px-4 py-6 text-sm">{t('No flagged players yet.')}</p>
{:else}
	<div class="grid min-h-0 grid-cols-[minmax(0,18rem)_minmax(0,1fr)] items-stretch">
		<nav
			class="border-secondary-800 divide-secondary-800 flex max-h-[70vh] min-h-0 flex-col divide-y overflow-y-auto border-r"
			aria-label={t('Select report')}
		>
			{#each reports.current ?? [] as report (report.id)}
				{@const isSelected = selected?.id === report.id}
				<button
					type="button"
					class={cn(
						interactive,
						'flex w-full flex-col gap-1 px-4 py-2.5 text-left text-sm transition-colors',
						isSelected
							? 'bg-secondary-950/80 text-primary font-medium'
							: 'text-secondary-300 hover:bg-secondary-950/50 hover:text-white'
					)}
					aria-current={isSelected ? 'true' : undefined}
					onclick={() => (selectedId = report.id)}
				>
					<span class="min-w-0 truncate">{accusedLabel(report)}</span>
					<span class={cn('text-xs', isSelected ? 'text-primary/70' : 'text-secondary-500')}>
						{dayjs(report.created).format('D MMM YYYY HH:mm')}
					</span>
					<span class="pt-0.5">
						<Badge variant={statusVariant(report.status)} class="px-2 py-0.5">
							{statusLabel(report.status)}
						</Badge>
					</span>
				</button>
			{/each}
		</nav>

		<div class="bg-secondary-950/50 flex min-h-0 min-w-0 flex-col">
			{#if selected}
				<div
					class="border-secondary-800 flex flex-wrap items-start justify-between gap-3 border-b px-4 py-2.5"
				>
					<div class="min-w-0">
						<p class="text-secondary-300 text-xs font-semibold tracking-wide uppercase">
							{#if accusedSteamId(selected)}
								<a
									href="/players/{accusedSteamId(selected)}"
									class={cn(interactive, 'hover:text-primary')}
								>
									{accusedLabel(selected)}
								</a>
							{:else}
								{accusedLabel(selected)}
							{/if}
						</p>
						<p class="text-secondary-500 mt-0.5 text-xs">
							{t('Reported by {name}', { name: reporterLabel(selected) })}
							· {t('Session')}
							{selected.session_id}
						</p>
						{#if selected.accused_steam_id}
							<p class="text-secondary-500 text-xs tabular-nums">{selected.accused_steam_id}</p>
						{/if}
					</div>
					<div class="flex flex-wrap items-center gap-2">
						{#if selected.lobby}
							<Button href="/history/{selected.lobby}" variant="secondary" size="sm">
								{t('Open match')}
							</Button>
						{/if}
						<Badge variant={statusVariant(selected.status)}>{statusLabel(selected.status)}</Badge>
					</div>
				</div>

				<div class="border-secondary-800 flex-1 border-b p-4">
					<p class="text-secondary-300 mb-3 text-xs font-semibold tracking-wide uppercase">
						{t('Screenshots')}
					</p>
					{#if captures.loading}
						<p class="text-secondary-500 text-sm">{t('Loading screenshots...')}</p>
					{:else if (captures.current?.length ?? 0) > 0}
						<div class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
							{#each captures.current ?? [] as capture (capture.id)}
								<button
									type="button"
									class={cn(
										interactive,
										'border-secondary-800 hover:border-secondary-600 overflow-hidden rounded-md border transition-colors'
									)}
									onclick={() => openCapture(capture)}
								>
									<CaptureImage {capture} class="h-20 w-full object-cover" />
								</button>
							{/each}
						</div>
					{:else}
						<p class="text-secondary-500 text-sm">{t('No screenshots for this report.')}</p>
					{/if}
				</div>

				<div class="flex flex-wrap gap-2 px-4 py-3">
					<Button
						type="button"
						size="sm"
						variant="destructive"
						loading={updatingId === selected.id}
						onclick={() => void markCheater(selected)}
					>
						{t('Mark as cheater')}
					</Button>
					<Button
						type="button"
						size="sm"
						variant="success"
						loading={updatingId === selected.id}
						onclick={() => void setStatus(selected, 'dismissed')}
					>
						{t('Dismiss')}
					</Button>
					<Button
						type="button"
						size="sm"
						variant="secondary"
						loading={updatingId === selected.id}
						onclick={() => void removeCheater(selected)}
					>
						{t('Remove cheater label')}
					</Button>
				</div>
			{:else}
				<p class="text-secondary-400 px-4 py-6 text-sm">{t('Select a report to review it.')}</p>
			{/if}
		</div>
	</div>
{/if}
