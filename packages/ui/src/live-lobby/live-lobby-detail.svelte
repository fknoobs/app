<script lang="ts">
	import MapImage from '../ui/map-image.svelte';
	import * as List from '../ui/list';
	import { detailMetaGrid } from '@company-of-heroes/ui/variants';
	import LiveLobbyPlayers from './live-lobby-players.svelte';
	import { defaultLiveLobbyPlayerLabel, type LiveLobby, type LiveLobbyPlayer } from './types';

	type Props = {
		lobby: LiveLobby;
		resolveMapSrc: (map: string | undefined) => string | undefined;
		resolveFallbackSrc?: () => string | undefined;
		resolveFactionFlag: (race: number) => string;
		formatMapName: (map: string) => string;
		formatStarted: (createdAt: string) => string;
		playerHref: (player: LiveLobbyPlayer) => string | null;
		playerLabel?: (player: LiveLobbyPlayer) => string;
		matchTypeLabel?: string;
		gameModeLabel?: string;
		playersLabel?: string;
		startedLabel?: string;
		hostLabel?: string;
		teamsLabel?: string;
		alliesLabel?: string;
		axisLabel?: string;
		unknownHostLabel?: string;
		rankedLabel?: string;
		customLabel?: string;
		teamsValue: string;
	};

	let {
		lobby,
		resolveMapSrc,
		resolveFallbackSrc,
		resolveFactionFlag,
		formatMapName,
		formatStarted,
		playerHref,
		playerLabel = defaultLiveLobbyPlayerLabel,
		matchTypeLabel = 'Match type',
		gameModeLabel = 'Game mode',
		playersLabel = 'Players',
		startedLabel = 'Started',
		hostLabel = 'Host',
		teamsLabel = 'Teams',
		alliesLabel = 'Allies',
		axisLabel = 'Axis',
		unknownHostLabel = 'Unknown',
		rankedLabel = 'Ranked',
		customLabel = 'Custom',
		teamsValue
	}: Props = $props();

	const mapName = $derived(formatMapName(lobby.map));
	const occupied = $derived(lobby.players.length);
</script>

<div class="border-secondary-800 overflow-clip border-b">
	<div
		class="border-secondary-800 grid grid-cols-1 border-b sm:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]"
	>
		<div class="border-secondary-800 aspect-square sm:aspect-auto sm:h-full sm:border-r">
			<MapImage map={lobby.map} alt={mapName} flush {resolveMapSrc} {resolveFallbackSrc} />
		</div>
		<div class="min-w-0 px-6 py-4">
			<span class="font-heading mb-3 block truncate text-3xl font-bold text-white">{mapName}</span>
			<div class={detailMetaGrid}>
				<List.Title>{matchTypeLabel}</List.Title>
				<List.Value>{lobby.isRanked ? rankedLabel : customLabel}</List.Value>
				<List.Title>{gameModeLabel}</List.Title>
				<List.Value>{lobby.modeLabel}</List.Value>
				<List.Title>{playersLabel}</List.Title>
				<List.Value>{occupied}</List.Value>
				<List.Title>{hostLabel}</List.Title>
				<List.Value>{lobby.hostName || unknownHostLabel}</List.Value>
				<List.Title>{startedLabel}</List.Title>
				<List.Value class="tabular-nums">{formatStarted(lobby.createdAt)}</List.Value>
				<List.Title>{teamsLabel}</List.Title>
				<List.Value>{teamsValue}</List.Value>
			</div>
		</div>
	</div>
	<div class="border-secondary-800 border-b">
		<LiveLobbyPlayers
			players={lobby.players}
			{resolveFactionFlag}
			{playerHref}
			{playerLabel}
			{alliesLabel}
			{axisLabel}
		/>
	</div>
</div>
