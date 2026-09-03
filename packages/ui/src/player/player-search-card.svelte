<script lang="ts">
	import * as List from '../ui/list';
	import { cn } from '@company-of-heroes/ui/cn';
	import { interactive } from '@company-of-heroes/ui/variants';
	import type { PlayerSearchResult } from './types';

	type Props = {
		player: PlayerSearchResult;
		href: string;
		flagSrc: string | null;
		resolveAvatarUrl: (url: string) => string;
		steamIdLabel?: string;
		profileIdLabel?: string;
	};

	let {
		player,
		href,
		flagSrc,
		resolveAvatarUrl,
		steamIdLabel = 'Steam ID:',
		profileIdLabel = 'Profile ID:'
	}: Props = $props();
</script>

<div class="border-secondary-800 overflow-clip border-b">
	<div class="flex gap-4 p-4">
		<a {href} class={cn(interactive, 'shrink-0')}>
			{#if player.avatarUrl}
				<img
					src={resolveAvatarUrl(player.avatarUrl)}
					alt={player.alias}
					class="size-16 rounded-xl border-3 border-gray-400 object-cover"
				/>
			{:else}
				<div class="bg-secondary-800 size-16 rounded-xl border-3 border-gray-400"></div>
			{/if}
		</a>
		<div class="min-w-0 grow py-1">
			<a
				{href}
				class={cn(
					interactive,
					'hover:text-primary mb-2 flex min-w-0 items-center gap-2 transition-colors'
				)}
			>
				{#if flagSrc}
					<img class="h-5 w-auto shrink-0 rounded-xs" src={flagSrc} alt={player.country ?? ''} />
				{/if}
				<span class="font-heading truncate text-xl font-bold text-white">{player.alias}</span>
			</a>
			<List.Root class="gap-x-4">
				<List.Title>{steamIdLabel}</List.Title>
				<List.Value>{player.steamId || '—'}</List.Value>
				<List.Title>{profileIdLabel}</List.Title>
				<List.Value>{player.profileId}</List.Value>
			</List.Root>
		</div>
	</div>
</div>
