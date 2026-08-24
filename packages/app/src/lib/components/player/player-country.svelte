<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { usePlayer } from '.';
	import { cn } from '$lib/utils';
	import { tooltip } from '$lib/attachments';

	type Props = HTMLAttributes<HTMLImageElement>;

	let { class: className, ...restProps }: Props = $props();
	const { player } = $derived(usePlayer());

	const regionCode = $derived.by(() => {
		if (!player.profile?.country) {
			return null;
		}

		const region = String(player.profile.country).trim().toUpperCase();
		if (!/^[A-Z]{2}$/.test(region)) {
			return null;
		}

		return region;
	});

	const countryName = $derived.by(() => {
		if (!regionCode) {
			return 'Unknown';
		}

		try {
			const dn = new Intl.DisplayNames(['en'], { type: 'region' });
			return dn.of(regionCode) || 'Unknown';
		} catch {
			return 'Unknown';
		}
	});
</script>

{#if regionCode}
	<div
		{...restProps}
		class={cn(
			'ring-secondary-800 h-5 w-5 rounded-full bg-size-[48px] bg-center bg-no-repeat ring-4',
			className
		)}
		style="background-image: url('https://flagsapi.com/{regionCode}/flat/64.png');"
		{@attach tooltip(countryName)}
	></div>
{/if}
