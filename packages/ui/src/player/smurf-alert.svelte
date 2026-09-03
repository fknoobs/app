<script lang="ts">
	import { cn } from '@company-of-heroes/ui/cn';
	import { interactive } from '@company-of-heroes/ui/variants';
	import ArrowRightIcon from 'phosphor-svelte/lib/ArrowRightIcon';
	import BinocularsIcon from 'phosphor-svelte/lib/BinocularsIcon';

	export type PlayerSmurf = {
		lenderSteamId: string;
		lenderProfileId: number | null;
		lenderAlias: string;
		lenderAvatarUrl: string | null;
	};

	type Props = {
		smurf: PlayerSmurf;
		lenderHref: string;
		resolveAvatarUrl?: (url: string) => string;
	};

	let { smurf, lenderHref, resolveAvatarUrl = (url) => url }: Props = $props();

	const lenderAvatar = $derived(
		smurf.lenderAvatarUrl ? resolveAvatarUrl(smurf.lenderAvatarUrl) : null
	);
</script>

<div class="text-destructive inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold">
	<BinocularsIcon class="shrink-0" size={16} weight="bold" />
	<span>Smurf account</span>
	<a href={lenderHref} class={cn(interactive, 'inline-flex items-center gap-1.5 hover:underline')}>
		{#if lenderAvatar}
			<img src={lenderAvatar} alt="" class="size-5 rounded-sm object-cover" />
		{/if}
		<span>{smurf.lenderAlias}</span>
		<ArrowRightIcon size={12} weight="bold" />
	</a>
</div>
