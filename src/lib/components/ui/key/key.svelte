<script lang="ts">
	import type { KeyProps } from '.';
	import { cn } from '$lib/utils';
	import { SubscriptionBadge } from '../badge';
	import CopyIcon from 'phosphor-svelte/lib/Copy';
	import CheckIcon from 'phosphor-svelte/lib/Check';

	let { subscription, xi_api_key }: KeyProps = $props();
	let didCopy = $state(false);

	const copyKey = () => {
		navigator.clipboard.writeText(xi_api_key as string);
		didCopy = true;
	};

	$effect(() => {
		if (didCopy) {
			setTimeout(() => (didCopy = false), 2000);
		}
	});
</script>

<div class="flex min-w-0 items-center gap-8 rounded-lg border border-neutral-700 px-4 py-2">
	<span class="flex items-center gap-4 overflow-hidden text-ellipsis whitespace-nowrap">
		<button
			onclick={copyKey}
			class="flex cursor-pointer items-center gap-2 [&>svg]:size-5"
			title="Copy key"
		>
			{#if didCopy}
				<CheckIcon class="text-green-500" />
			{:else}
				<CopyIcon class="text-neutral-600 transition-colors hover:text-white" />
			{/if}
		</button>
		{xi_api_key}
	</span>
	<SubscriptionBadge tier={subscription.tier} class="ms-auto" />
</div>
