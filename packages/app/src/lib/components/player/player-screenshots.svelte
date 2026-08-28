<script lang="ts">
	import CaptureImage from '$lib/components/anti-cheat/capture-image.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { interactive } from '$lib/components/ui/variants';
	import { resource } from 'runed';
	import { app } from '$core/app/context';
	import { listCapturesBySteamId, type CaptureRecord } from '$core/pocketbase/anti-cheat';
	import dayjs from '$lib/dayjs';
	import { cn, normalizeMapName } from '$lib/utils';
	import { useI18n } from '$lib/i18n';

	type Props = {
		steamId: string;
		userId?: string;
	};

	type SessionGroup = {
		sessionId: number;
		map?: string;
		captures: CaptureRecord[];
	};

	let { steamId, userId }: Props = $props();
	const { t } = useI18n();

	const captures = resource(
		() => `${steamId}:${userId ?? ''}`,
		() => listCapturesBySteamId(steamId, { userId })
	);

	const sessions = $derived.by((): SessionGroup[] => {
		const items = captures.current ?? [];
		const bySession: Record<string, CaptureRecord[]> = {};
		for (const capture of items) {
			const sessionId = String(capture.session_id ?? 0);
			(bySession[sessionId] ??= []).push(capture);
		}

		return Object.entries(bySession).map(([sessionKey, groupCaptures]) => ({
			sessionId: Number(sessionKey),
			map: groupCaptures.find((capture) => capture.map)?.map,
			captures: groupCaptures
		}));
	});

	const lobbyIds = resource(
		() =>
			sessions
				.map((session) => session.sessionId)
				.filter((id) => id > 0)
				.join(','),
		async (key) => {
			const ids = key ? key.split(',').map(Number) : [];
			return app.database.matches.getIdsBySessionIds(ids);
		}
	);

	let selectedSessionId = $state<number | null>(null);

	const activeSession = $derived.by(() => {
		if (sessions.length === 0) return null;
		if (selectedSessionId != null) {
			const match = sessions.find((session) => session.sessionId === selectedSessionId);
			if (match) return match;
		}
		return sessions[0] ?? null;
	});

	function selectSession(sessionId: number) {
		selectedSessionId = sessionId;
	}

	function sessionLabel(session: SessionGroup) {
		return session.map ? normalizeMapName(session.map) : t('Match');
	}

	function sessionDate(session: SessionGroup) {
		return dayjs(session.captures[0]?.captured_at || session.captures[0]?.created).format(
			'D MMM YYYY HH:mm'
		);
	}

	function captureDate(capture: CaptureRecord) {
		return dayjs(capture.captured_at || capture.created).format('D MMM YYYY HH:mm');
	}

	function openCapture(capture: CaptureRecord) {
		app.modal.create({
			component: CaptureImage,
			title: t('Screenshot'),
			description: captureDate(capture),
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
			{#each [0, 1, 2] as row (row)}
				<div class="flex flex-col gap-1.5 px-4 py-3">
					<Skeleton class="h-3.5 w-24" />
					<Skeleton class="h-3 w-20" />
				</div>
			{/each}
		</div>
		<div class="grid grid-cols-3 gap-2 p-4 sm:grid-cols-4 md:grid-cols-5">
			{#each [0, 1, 2, 3, 4] as thumb (thumb)}
				<Skeleton class="h-20 w-full rounded-md" />
			{/each}
		</div>
	</div>
{:else if sessions.length === 0}
	<p class="text-secondary-400 px-4 py-6 text-sm">
		{t('No screenshots for this player. Screenshots only appear when they used the app.')}
	</p>
{:else}
	<div class="grid min-h-0 grid-cols-[minmax(0,14rem)_minmax(0,1fr)] items-stretch">
		<nav
			class="border-secondary-800 divide-secondary-800 flex h-full min-h-0 flex-col divide-y border-r"
			aria-label={t('Select match')}
		>
			{#each sessions as session (session.sessionId || session.captures[0]?.id)}
				{@const isSelected = activeSession?.sessionId === session.sessionId}
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
					onclick={() => selectSession(session.sessionId)}
				>
					<span class="min-w-0 truncate">{sessionLabel(session)}</span>
					<span
						class={cn(
							'text-xs tabular-nums',
							isSelected ? 'text-primary/70' : 'text-secondary-500'
						)}
					>
						{sessionDate(session)}
					</span>
					<span class={cn('text-xs', isSelected ? 'text-primary/70' : 'text-secondary-500')}>
						{session.captures.length}
						{session.captures.length === 1 ? ` ${t('screenshot')}` : ` ${t('screenshots')}`}
					</span>
				</button>
			{/each}
		</nav>

		<div class="bg-secondary-950/50 min-h-0 min-w-0">
			{#if activeSession}
				{@const lobbyId = activeSession.sessionId
					? lobbyIds.current?.get(activeSession.sessionId)
					: undefined}
				<div
					class="border-secondary-800 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5"
				>
					<div class="min-w-0">
						<p class="text-secondary-300 text-xs font-semibold tracking-wide uppercase">
							{sessionLabel(activeSession)}
						</p>
						<p class="text-secondary-500 text-xs tabular-nums">
							{sessionDate(activeSession)}
							{#if activeSession.sessionId}
								· {activeSession.sessionId}
							{/if}
						</p>
					</div>
					{#if lobbyId}
						<Button href="/history/{lobbyId}" variant="secondary" size="sm">
							{t('Open match')}
						</Button>
					{/if}
				</div>
				<div class="grid grid-cols-3 gap-2 p-4 sm:grid-cols-4 md:grid-cols-5">
					{#each activeSession.captures as capture (capture.id)}
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
