<script lang="ts">
	import type { LobbyPlayer } from '@fknoobs/app';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import CaptureImage from '$lib/components/anti-cheat/capture-image.svelte';
	import CheaterAlert from '$lib/components/player/cheater-alert.svelte';
	import { confirm } from '@tauri-apps/plugin-dialog';
	import { resource } from 'runed';
	import { account } from '$core/account';
	import { app } from '$core/app/context';
	import {
		createPlayerFlag,
		listCapturesBySession,
		listOwnReportForMatch,
		type CaptureRecord
	} from '$core/pocketbase/anti-cheat';
	import type { UsersResponse } from '$core/pocketbase/types';
	import { getPlayerAlias, getPlayerProfileId } from '$lib/components/widgets/dashboard-utils';
	import { interactive } from '$lib/components/ui/variants';
	import dayjs from '$lib/dayjs';
	import { cn } from '$lib/utils';
	import { useI18n } from '$lib/i18n';
	import { ClientResponseError } from 'pocketbase';

	type ResultPlayer = {
		steamId?: string | null;
		name?: string | null;
		alias?: string | null;
		profile_id?: number | null;
	};

	type Props = {
		sessionId: number;
		lobbyId?: string;
		players?: LobbyPlayer[];
		resultPlayers?: ResultPlayer[];
		cheaters?: Set<string>;
	};

	type CaptureGroup = {
		key: string;
		userId: string;
		steamId: string;
		alias: string;
		profileId?: number;
		captures: CaptureRecord[];
	};

	let {
		sessionId,
		lobbyId,
		players = [],
		resultPlayers = [],
		cheaters = new Set()
	}: Props = $props();
	const { t } = useI18n();

	const captures = resource(
		() => sessionId,
		(id) => listCapturesBySession(id)
	);
	const ownReports = resource(
		() => (account.isAuthenticated ? `${account.userId}:${sessionId}` : null),
		() => listOwnReportForMatch(account.userId, sessionId)
	);

	let selectedKey = $state<string | null>(null);
	let flaggingKey = $state<string | null>(null);
	let extraFlagged = $state<string[]>([]);

	function captureUser(capture: CaptureRecord): UsersResponse | null {
		return (capture.expand as { user?: UsersResponse } | undefined)?.user ?? null;
	}

	function steamIdsOf(groupCaptures: CaptureRecord[]): string[] {
		const ids: string[] = [];
		for (const capture of groupCaptures) {
			if (capture.steam_id && !ids.includes(capture.steam_id)) {
				ids.push(capture.steam_id);
			}
			for (const steamId of captureUser(capture)?.steamIds ?? []) {
				const id = String(steamId);
				if (id && !ids.includes(id)) ids.push(id);
			}
		}
		return ids;
	}

	function resultSteamId(player: ResultPlayer): string | null {
		if (player.steamId) return player.steamId;
		if (player.name?.startsWith('/steam/')) return player.name.slice('/steam/'.length);
		return null;
	}

	function resolveGroup(groupCaptures: CaptureRecord[]): Omit<CaptureGroup, 'key' | 'captures'> {
		const userId = groupCaptures[0]?.user ?? '';
		const steamIds = steamIdsOf(groupCaptures);
		const steamId = steamIds[0] ?? '';

		const lobbyPlayer = players.find((player) => player.steamId && steamIds.includes(player.steamId));
		if (lobbyPlayer) {
			return {
				userId,
				steamId: lobbyPlayer.steamId || steamId,
				alias: lobbyPlayer.profile?.alias || getPlayerAlias(lobbyPlayer),
				profileId: getPlayerProfileId(lobbyPlayer)
			};
		}

		const resultPlayer = resultPlayers.find((player) => {
			const id = resultSteamId(player);
			return !!id && steamIds.includes(id);
		});
		if (resultPlayer?.alias) {
			return {
				userId,
				steamId: resultSteamId(resultPlayer) || steamId,
				alias: resultPlayer.alias,
				profileId: resultPlayer.profile_id && resultPlayer.profile_id > 0
					? resultPlayer.profile_id
					: undefined
			};
		}

		return { userId, steamId, alias: t('Player') };
	}

	const groups = $derived.by((): CaptureGroup[] => {
		const byUser: Record<string, CaptureRecord[]> = {};
		for (const capture of captures.current ?? []) {
			const key = capture.user || capture.steam_id || capture.id;
			(byUser[key] ??= []).push(capture);
		}

		return Object.entries(byUser).map(([key, groupCaptures]) => ({
			key,
			...resolveGroup(groupCaptures),
			captures: groupCaptures
		}));
	});

	const flaggedAccused = $derived(
		new Set([...(ownReports.current ?? []).map((report) => report.accused), ...extraFlagged])
	);

	const activeGroup = $derived.by(() => {
		if (selectedKey) {
			const match = groups.find((group) => group.key === selectedKey);
			if (match) return match;
		}
		return groups[0] ?? null;
	});

	const isSelf = (group: CaptureGroup) => {
		if (!account.isAuthenticated) return true;
		if (group.userId && group.userId === account.userId) return true;
		return !!group.steamId && (account.user.steamIds ?? []).includes(group.steamId);
	};

	const canFlag = (group: CaptureGroup) => {
		if (!account.isAuthenticated || isSelf(group) || !group.userId) return false;
		return !flaggedAccused.has(group.userId);
	};

	const flagPlayer = async (group: CaptureGroup) => {
		if (!canFlag(group)) return;
		const confirmed = await confirm(
			t('Flag {name} as suspicious for this match? Staff will review the screenshots.', {
				name: group.alias
			}),
			{ okLabel: t('Flag player'), cancelLabel: t('Cancel'), kind: 'warning' }
		);
		if (!confirmed) return;

		flaggingKey = group.key;
		try {
			await createPlayerFlag({
				reporter: account.userId,
				accused: group.userId,
				sessionId,
				lobbyId,
				accusedSteamId: group.steamId
			});
			extraFlagged = [...extraFlagged, group.userId];
			app.toast.success(t('Player flagged for review.'));
		} catch (error) {
			if (error instanceof ClientResponseError && error.status === 400) {
				app.toast.error(t('You already flagged this player for this match.'));
			} else {
				app.toast.error(t('Could not flag player.'));
			}
		} finally {
			flaggingKey = null;
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

{#if captures.loading}
	<div class="grid grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
		<div class="border-secondary-800 divide-secondary-800 divide-y border-r">
			{#each [0, 1] as row (row)}
				<div class="flex flex-col gap-1.5 px-4 py-3">
					<Skeleton class="h-3.5 w-24" />
					<Skeleton class="h-3 w-16" />
				</div>
			{/each}
		</div>
		<div class="grid grid-cols-3 gap-2 p-4 sm:grid-cols-4 md:grid-cols-5">
			{#each [0, 1, 2, 3] as thumb (thumb)}
				<Skeleton class="h-20 w-full rounded-md" />
			{/each}
		</div>
	</div>
{:else if groups.length === 0}
	<p class="text-secondary-400 px-4 py-6 text-sm">
		{t('No screenshots for this match. Screenshots only appear when a player used the app.')}
	</p>
{:else}
	<div class="grid min-h-0 grid-cols-[minmax(0,14rem)_minmax(0,1fr)] items-stretch">
		<nav
			class="border-secondary-800 divide-secondary-800 flex h-full min-h-0 flex-col divide-y border-r"
			aria-label={t('Select player')}
		>
			{#each groups as group (group.key)}
				{@const isSelected = activeGroup?.key === group.key}
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
					onclick={() => (selectedKey = group.key)}
				>
					<span class="flex min-w-0 items-center gap-2">
						<span class="min-w-0 truncate">{group.alias}</span>
						{#if group.steamId && cheaters.has(group.steamId)}
							<CheaterAlert compact />
						{/if}
					</span>
					<span class={cn('text-xs', isSelected ? 'text-primary/70' : 'text-secondary-500')}>
						{group.captures.length}
						{group.captures.length === 1 ? ` ${t('screenshot')}` : ` ${t('screenshots')}`}
					</span>
				</button>
			{/each}
		</nav>

		<div class="bg-secondary-950/50 min-h-0 min-w-0">
			{#if activeGroup}
				<div
					class="border-secondary-800 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5"
				>
					<div class="flex min-w-0 items-center gap-2">
						{#if activeGroup.profileId}
							<a
								href="/players/{activeGroup.profileId}"
								class={cn(
									interactive,
									'text-secondary-300 hover:text-primary truncate text-xs font-semibold tracking-wide uppercase'
								)}
							>
								{activeGroup.alias}
							</a>
						{:else}
							<p class="text-secondary-300 truncate text-xs font-semibold tracking-wide uppercase">
								{activeGroup.alias}
							</p>
						{/if}
						{#if activeGroup.steamId && cheaters.has(activeGroup.steamId)}
							<CheaterAlert compact />
						{/if}
					</div>
					{#if canFlag(activeGroup)}
						<Button
							type="button"
							size="sm"
							variant="destructive"
							loading={flaggingKey === activeGroup.key}
							onclick={() => void flagPlayer(activeGroup)}
						>
							{t('Flag player')}
						</Button>
					{:else if flaggedAccused.has(activeGroup.userId)}
						<p class="text-secondary-500 text-sm">{t('Flagged')}</p>
					{/if}
				</div>
				<div class="grid grid-cols-3 gap-2 p-4 sm:grid-cols-4 md:grid-cols-5">
					{#each activeGroup.captures as capture (capture.id)}
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
			{/if}
		</div>
	</div>
{/if}
