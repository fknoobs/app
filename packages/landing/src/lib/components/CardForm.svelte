<script lang="ts">
	import { goto } from '$app/navigation';
	import { navigating } from '$app/state';
	import Button from '$lib/components/Button.svelte';
	import { cn } from '$lib/cn';
	import { isPlayerId } from '$lib/steam-id';
	import { headerCellAction } from '$lib/variants';

	type Props = {
		initialId?: string;
	};

	let { initialId = '' }: Props = $props();

	let playerId = $state('');
	let validationError = $state<string | null>(null);
	const pending = $derived(Boolean(navigating.to?.params?.id));

	$effect.pre(() => {
		playerId = initialId;
	});

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		const trimmed = playerId.trim();
		if (!isPlayerId(trimmed)) {
			validationError = 'Enter a Steam ID64 (7656119…) or Relic profile id.';
			return;
		}
		validationError = null;
		void goto(`/players/${trimmed}`);
	}
</script>

<form onsubmit={handleSubmit}>
	<div class="flex h-11 items-stretch">
		<input
			id="player-id"
			type="text"
			inputmode="numeric"
			autocomplete="off"
			aria-label="Steam ID64 or profile id"
			placeholder="Steam ID64 or profile id"
			bind:value={playerId}
			class={cn(
				'placeholder:text-secondary-500 h-full w-72 shrink-0 rounded-none px-4 text-white',
				'border-secondary-800 border-y-0 border-r border-l-0 bg-transparent',
				'focus:bg-secondary-800/30 focus:outline-none'
			)}
		/>
		<div class="border-secondary-800 flex shrink-0 items-stretch border-r">
			<Button type="submit" class={headerCellAction} disabled={pending}>View player</Button>
		</div>
	</div>
	{#if validationError}
		<p class="text-destructive border-secondary-800 border-t px-4 py-2 text-sm">
			{validationError}
		</p>
	{/if}
</form>
