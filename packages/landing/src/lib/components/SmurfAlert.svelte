<script lang="ts">
	import type { PlayerSmurf } from '$lib/player';
	import { proxiedImageUrl } from '$lib/proxy-image';
	import { interactive } from '$lib/variants';
	import ArrowRightIcon from 'phosphor-svelte/lib/ArrowRightIcon';
	import BinocularsIcon from 'phosphor-svelte/lib/BinocularsIcon';

	type Props = {
		smurf: PlayerSmurf;
	};

	let { smurf }: Props = $props();

	const lenderId = $derived(String(smurf.lenderProfileId ?? smurf.lenderSteamId));
	const lenderAvatar = $derived(
		smurf.lenderAvatarUrl ? proxiedImageUrl(smurf.lenderAvatarUrl) : null
	);
</script>

<div class="text-destructive inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold">
	<BinocularsIcon class="shrink-0" size={16} weight="bold" />
	<span>Smurf account</span>
	<a href="/players/{lenderId}" class={[interactive, 'inline-flex items-center gap-1.5 hover:underline']}>
		{#if lenderAvatar}
			<img src={lenderAvatar} alt="" class="size-5 rounded-sm object-cover" />
		{/if}
		<span>{smurf.lenderAlias}</span>
		<ArrowRightIcon size={12} weight="bold" />
	</a>
</div>
