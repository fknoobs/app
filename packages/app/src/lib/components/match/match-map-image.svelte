<script lang="ts">
	import type { HTMLImgAttributes } from 'svelte/elements';
	import MapImage from '$lib/components/ui/map-image.svelte';
	import { useMatch } from '.';

	type Props = HTMLImgAttributes & { small?: boolean; flush?: boolean };

	const { small = false, flush = false, ...restProps }: Props = $props();
	const match = useMatch();
</script>

<MapImage map={match.map} {small} {flush} {...restProps} />
