<script lang="ts">
	import MapImage from '@company-of-heroes/ui/map-image';
	import { getDefaultMapImage, getMapImageFromName } from '$lib/utils/game';

	type Props = {
		map: string | undefined;
		small?: boolean;
		flush?: boolean;
		alt?: string | null;
		class?: string;
	};

	let { map, small, flush, alt = undefined, class: className }: Props = $props();
</script>

<MapImage
	{map}
	{small}
	{flush}
	alt={alt ?? undefined}
	class={className}
	resolveMapSrc={getMapImageFromName}
	resolveFallbackSrc={getDefaultMapImage}
/>
