<script lang="ts">
	import { LeaderboardStatPill as StatPill } from '@company-of-heroes/ui/leaderboard';

	type Props = {
		type: 'wins' | 'losses' | 'streak' | 'ratio';
		wins: number;
		losses: number;
		streak: number;
	};

	let props: Props = $props();
</script>

<StatPill {...props} />
