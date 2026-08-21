<script lang="ts">
	import type { SmurfAlertState } from '$lib/player/smurf';
	import { interactive } from '$lib/components/ui/variants';
	import ArrowRightIcon from 'phosphor-svelte/lib/ArrowRightIcon';
	import BinocularsIcon from 'phosphor-svelte/lib/BinocularsIcon';

	type Props = {
		smurf: SmurfAlertState;
	};

	let { smurf }: Props = $props();

	const lenderHref = $derived(
		smurf.status === 'shared'
			? `/players/${smurf.lenderProfile?.profile_id ?? smurf.lenderSteamId}`
			: undefined
	);

	const lenderLabel = $derived(
		smurf.status === 'shared' && smurf.lenderProfile
			? smurf.lenderProfile.alias
			: smurf.status === 'shared' && smurf.lenderSteam
				? smurf.lenderSteam.personaname
				: 'Original account'
	);

	const lenderAvatar = $derived(
		smurf.status === 'shared' ? smurf.lenderSteam?.avatarfull : undefined
	);
</script>

{#if smurf.status === 'shared' && lenderHref}
	<div class="text-destructive inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold">
		<BinocularsIcon class="shrink-0" size={16} weight="bold" />
		<span>Smurf account</span>
		<a href={lenderHref} class={[interactive, 'inline-flex items-center gap-1.5 hover:underline']}>
			{#if lenderAvatar}
				<img src={lenderAvatar} alt="" class="size-5 rounded-sm object-cover" />
			{/if}
			<span>{lenderLabel}</span>
			<ArrowRightIcon size={12} weight="bold" />
		</a>
	</div>
{/if}
