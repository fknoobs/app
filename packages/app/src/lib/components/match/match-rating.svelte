<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { useMatch } from '.';
	import { cn } from '$lib/utils';
	import { tooltip } from '$lib/attachments';
	import { app } from '$core/app/context';
	import CaretUp from 'phosphor-svelte/lib/CaretUpIcon';
	import CaretDown from 'phosphor-svelte/lib/CaretDownIcon';
	import MinusIcon from 'phosphor-svelte/lib/MinusIcon';

	type Props = HTMLAttributes<HTMLSpanElement>;

	const { ...restProps }: Props = $props();
	const match = useMatch();
	const steamIds = app.features.auth.user.steamIds;

	const player = $derived.by(() => {
		const players = match.result?.players;
		if (!players?.length) {
			return null;
		}

		return players.find((p) => steamIds.includes(p.steamId)) ?? null;
	});

	const change = $derived.by(() => {
		if (!player) return undefined;
		if (!Number.isFinite(player.newrating) || !Number.isFinite(player.oldrating)) {
			return undefined;
		}
		return player.newrating - player.oldrating;
	});
</script>

<span
	{...restProps}
	class={cn('inline-flex items-center gap-2', restProps.class)}
	{@attach tooltip('Rating Change (elo)')}
>
	{#if change !== undefined}
		{#if change < 0}
			<CaretDown class="inline-block text-red-400" weight="duotone" />
			<span class="text-red-200">{Math.abs(change)}</span>
		{:else if change > 0}
			<CaretUp class="text-success inline-block" weight="duotone" />
			<span class="text-green-300">{change}</span>
		{:else}
			<MinusIcon class="text-secondary-500 inline-block" />
			<span class="text-secondary-500">0</span>
		{/if}
	{/if}
</span>
