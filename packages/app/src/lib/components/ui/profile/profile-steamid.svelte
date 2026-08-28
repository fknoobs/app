<script lang="ts">
	import type { HTMLAnchorAttributes } from 'svelte/elements';
	import { useProfile } from '.';
	import { cn } from '$lib/utils';
	import { interactive } from '$lib/components/ui/variants';

	type Props = HTMLAnchorAttributes;

	const { ...restProps }: Props = $props();
	const profile = useProfile();
</script>

<a
	{...restProps}
	href={`https://steamcommunity.com/profiles/${profile.steam.steamid}`}
	target="_blank"
	rel="noopener noreferrer"
	class={cn(interactive, 'hover:text-primary transition-colors', restProps.class)}
>
	{profile.steam.steamid}
</a>
