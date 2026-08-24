<script lang="ts">
	import * as List from '$lib/components/ui/list';
	import * as Player from '$lib/components/player';
	import { useLobby } from './context.svelte';
	import { sortBy } from 'lodash-es';
	import { cn } from '$lib/utils';
	import { isMePlayer } from '$lib/utils/player-me';

	let lobby = useLobby();
</script>

<List.Root>
	<List.Title>Session ID</List.Title>
	<List.Value>{lobby.sessionId}</List.Value>
	<List.Title>Type</List.Title>
	<List.Value>{lobby.type}</List.Value>
	<List.Title>Started at</List.Title>
	<List.Value>{lobby.startedAt.split(':').slice(0, 2).join(':')}</List.Value>
	<List.Title>Factions</List.Title>
	<List.Value class="flex items-center gap-2">
		{#each sortBy(lobby.players, 'team') as player}
			<Player.Root {player}>
				<Player.Faction class={cn(isMePlayer(player) && 'ring-primary')} />
			</Player.Root>
		{/each}
	</List.Value>
</List.Root>
