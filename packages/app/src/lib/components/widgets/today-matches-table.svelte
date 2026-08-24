<script lang="ts">
	import type { MatchExpanded } from '$core/app/database/matches';
	import { MatchListTable } from '$lib/components/match';

	type Props = {
		matches: MatchExpanded[];
		loading?: boolean;
	};

	let { matches, loading = false }: Props = $props();
</script>

<MatchListTable {matches} {loading} />
