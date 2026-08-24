<script lang="ts">
	import { SetCrumbs } from '$lib/components/ui/breadcrumb';
	import { useReplay } from '.';

	let replay = $derived(useReplay());
</script>

<SetCrumbs items={[{ label: replay.replayName || 'Replay' }]} />
