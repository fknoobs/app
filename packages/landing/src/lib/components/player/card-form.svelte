<script lang="ts">
	import { goto } from '$app/navigation';
	import { navigating } from '$app/state';
	import { Button } from '@company-of-heroes/ui/button';
	import { cn } from '$lib/utils/cn';
	import { href, useI18n } from '$lib/i18n';
	import { isPlayerId } from '$lib/utils/player/steam-id';
	import { headerCellAction } from '$lib/utils/variants';
	import MagnifyingGlassIcon from 'phosphor-svelte/lib/MagnifyingGlassIcon';

	type Props = {
		initialQuery?: string;
	};

	let { initialQuery = '' }: Props = $props();
	const { t } = useI18n();

	let query = $derived(initialQuery);
	let validationError = $state<string | null>(null);
	const pending = $derived(
		Boolean(navigating.to?.params?.id) || Boolean(navigating.to?.url.searchParams.get('q'))
	);

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		const trimmed = query.trim();
		if (!trimmed) {
			validationError = t('Enter a Steam ID64, Relic profile id, or player name.');
			return;
		}

		validationError = null;
		if (isPlayerId(trimmed)) {
			void goto(href(`/players/${trimmed}`));
			return;
		}

		void goto(href(`/players?q=${encodeURIComponent(trimmed)}`));
	}
</script>

<form onsubmit={handleSubmit}>
	<div class="flex h-11 items-stretch">
		<input
			id="player-search"
			type="text"
			autocomplete="off"
			aria-label={t('Steam ID, profile ID, or player name')}
			placeholder={t('Steam ID, profile ID, or player name')}
			bind:value={query}
			class={cn(
				'placeholder:text-secondary-500 h-full min-w-0 flex-1 px-4 text-white',
				'border-secondary-800 border-y-0 border-r border-l-0 bg-transparent',
				'focus:bg-secondary-800/30 focus:outline-none'
			)}
		/>
		<div class="border-secondary-800 flex shrink-0 items-stretch border-r">
			<Button type="submit" variant="ghost" class={headerCellAction} disabled={pending}>
				<MagnifyingGlassIcon size={16} />
				{t('Search')}
			</Button>
		</div>
	</div>
	{#if validationError}
		<p class="text-destructive border-secondary-800 border-t px-4 py-2 text-sm">
			{validationError}
		</p>
	{/if}
</form>
