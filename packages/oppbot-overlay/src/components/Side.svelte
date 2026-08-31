<script lang="ts">
	import Unit from './Unit.svelte';
	import type { Team } from '../lib/types';

	interface Props {
		team: Team;
		index: number;
		matchType: number;
		meId?: number;
		isReplay?: boolean;
	}

	let { team, index, matchType, meId, isReplay = false }: Props = $props();
</script>

<aside class="side side-{index}">
	<div class="side__units">
		{#each team.players as player, i (player.index ?? i)}
			<Unit
				{player}
				{matchType}
				teamIndex={index}
				isMe={meId != null && player.playerId === meId}
				{isReplay}
			/>
		{/each}
	</div>
</aside>
