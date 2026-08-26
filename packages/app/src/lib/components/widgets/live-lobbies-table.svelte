<script lang="ts">
	import type { LiveLobby } from '$core/app/database/lobbies-live';
	import { goto } from '$app/navigation';
	import MapImage from '$lib/components/ui/map-image.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { cn, getFactionFlagFromRace, normalizeMapName } from '$lib/utils';
	import { interactive } from '$lib/components/ui/variants';
	import { tooltip } from '$lib/attachments';
	import dayjs from '$lib/dayjs';
	import CaretDown from 'phosphor-svelte/lib/CaretDownIcon';
	import LiveLobbyPlayers from './live-lobby-players.svelte';
	import {
		getAlliesPlayers,
		getAxisPlayers,
		getLiveLobbyModeLabel,
		getPlayerAlias
	} from './dashboard-utils';
	import { useI18n } from '$lib/i18n';

	type Props = {
		lobbies: LiveLobby[];
		loading?: boolean;
	};

	let { lobbies, loading = false }: Props = $props();
	const { t } = useI18n();
	let expandedId = $state<string | null>(null);

	function toggleExpanded(id: string) {
		expandedId = expandedId === id ? null : id;
	}

	function handleRowClick(event: MouseEvent, id: string) {
		const target = event.target as HTMLElement;
		if (target.closest('a, button')) return;
		toggleExpanded(id);
	}

	function openDetails(event: MouseEvent, href: string) {
		event.stopPropagation();
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		void goto(href);
	}
</script>

<table class="w-full table-fixed">
	<colgroup>
		<col class="w-2/24" />
		<col class="w-3/24" />
		<col class="w-3/24" />
		<col class="w-3/24" />
		<col class="w-3/24" />
		<col class="w-3/24" />
		<col class="w-3/24" />
		<col class="w-3/24" />
		<col class="w-1/24" />
	</colgroup>
	<thead>
		<tr class="bg-secondary-950/90 text-secondary-300 border-secondary-800 border-b text-left text-xs font-semibold tracking-wide uppercase">
			<th class="px-4 py-3 font-semibold">{t('Map')}</th>
			<th class="px-4 py-3 font-semibold">{t('Name')}</th>
			<th class="px-4 py-3 font-semibold">{t('Type')}</th>
			<th class="px-4 py-3 font-semibold">{t('Allies')}</th>
			<th class="px-4 py-3 font-semibold">{t('Axis')}</th>
			<th class="px-4 py-3 font-semibold">{t('Host')}</th>
			<th class="px-4 py-3 font-semibold whitespace-nowrap">{t('Started at')}</th>
			<th class="px-4 py-3"></th>
			<th class="px-4 py-3"></th>
		</tr>
	</thead>
	<tbody>
		{#if loading}
			{#each Array(3) as _, index (index)}
				<tr class="border-secondary-800 h-11 border-b">
					{#each Array(9) as _, cellIndex (cellIndex)}
						<td class="px-4">
							<Skeleton class="h-4 w-full" />
						</td>
					{/each}
				</tr>
			{/each}
		{:else}
			{#each lobbies as lobby (lobby.id)}
				{@const expanded = expandedId === lobby.id}
				{@const allies = getAlliesPlayers(lobby.players)}
				{@const axis = getAxisPlayers(lobby.players)}
				{@const hostName = lobby.user?.name ?? lobby.user?.email ?? t('Unknown')}
				<tr
					class={cn(
						interactive,
						'border-secondary-800 text-secondary-300 h-11 border-b transition-colors',
						'hover:bg-secondary-950/60 hover:text-primary',
						expanded && 'bg-secondary-950/60 text-primary'
					)}
					aria-expanded={expanded}
					onclick={(event) => handleRowClick(event, lobby.id)}
				>
					<td class="h-11 overflow-clip py-0 pr-0 pl-4">
						<MapImage small flush map={lobby.map} />
					</td>
					<td class="truncate px-4 font-medium">{normalizeMapName(lobby.map)}</td>
					<td class="text-secondary-400 truncate px-4 text-sm">
						{getLiveLobbyModeLabel(lobby.players, lobby.isRanked)}
					</td>
					<td class="px-4">
						<span class="flex items-center gap-1.5">
							{#each allies as player (player.index)}
								<img
									src={getFactionFlagFromRace(player.race)}
									alt=""
									class="ring-secondary-800 h-4 w-4 rounded-full object-cover ring-4"
									{@attach tooltip(getPlayerAlias(player))}
								/>
							{/each}
						</span>
					</td>
					<td class="px-4">
						<span class="flex items-center gap-1.5">
							{#each axis as player (player.index)}
								<img
									src={getFactionFlagFromRace(player.race)}
									alt=""
									class="ring-secondary-800 h-4 w-4 rounded-full object-cover ring-4"
									{@attach tooltip(getPlayerAlias(player))}
								/>
							{/each}
						</span>
					</td>
					<td class="text-secondary-400 truncate px-4 text-sm">{hostName}</td>
					<td class="text-secondary-500 truncate px-4 text-xs tabular-nums">
						{dayjs(lobby.createdAt).fromNow()}
					</td>
					<td class="px-4">
						<Button
							href="/live/{lobby.id}"
							size="sm"
							variant="secondary"
							class="h-7 px-2.5 text-xs"
							onclick={(event) => openDetails(event, `/live/${lobby.id}`)}
						>
							{t('Details')}
						</Button>
					</td>
					<td class="px-4">
						<CaretDown class={cn('size-4 transition-transform', expanded && 'rotate-180')} />
					</td>
				</tr>
				{#if expanded}
					<tr>
						<td colspan="9" class="p-0">
							<LiveLobbyPlayers {lobby} />
						</td>
					</tr>
				{/if}
			{/each}
		{/if}
	</tbody>
</table>
