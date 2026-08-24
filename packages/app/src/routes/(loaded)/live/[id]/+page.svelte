<script lang="ts">
	import type { LobbyPlayer } from '@fknoobs/app';
	import type { LiveLobby } from '$core/app/database/lobbies-live';
	import type { LobbiesLiveResponse, UsersResponse } from '$core/pocketbase/types';
	import type { UnsubscribeFunc } from 'pocketbase';
	import { onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { app } from '$core/app/context';
	import { liveLobbyToLobbyData } from '$core/game/lobby-utils';
	import CurrentGameView from '$lib/components/widgets/current-game-view.svelte';
	import { resource, watch } from 'runed';

	type LiveLobbyRecord = LobbiesLiveResponse<
		LobbyPlayer[],
		{
			user: UsersResponse<string[], string[]>;
		}
	>;

	let unsubscribe = $state<UnsubscribeFunc>();

	const lobby = resource(
		() => page.params.id,
		(id) => app.database.lobbiesLive.getOne(id!)
	);

	const match = $derived.by(() => {
		if (!lobby.current) return null;
		return liveLobbyToLobbyData(toLobbyRecord(lobby.current));
	});

	function toLobbyRecord(record: LiveLobby): LiveLobbyRecord {
		return {
			...record,
			expand: { user: record.user }
		} as unknown as LiveLobbyRecord;
	}

	watch(
		() => lobby.error,
		(error) => {
			if (error) goto('/');
		}
	);

	watch(
		() => page.params.id,
		async (id) => {
			await unsubscribe?.();
			unsubscribe = undefined;
			if (!id) return;

			unsubscribe = await app.database.lobbiesLive.subscribe(id, (event) => {
				if (event.action === 'delete') {
					goto('/');
					return;
				}
				if (event.action === 'update') {
					app.database.lobbiesLive
						.getOne(event.record.id)
						.then((updated) => lobby.mutate(updated))
						.catch(() => goto('/'));
				}
			});
		}
	);

	onDestroy(() => {
		unsubscribe?.();
	});
</script>

{#key match}
	{#if match}
		<div class="px-5 py-4">
			<CurrentGameView lobby={match} />
		</div>
	{/if}
{/key}
