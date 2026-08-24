<script lang="ts">
	import Sortable from 'sortablejs';
	import PlusIcon from 'phosphor-svelte/lib/PlusIcon';
	import ExportIcon from 'phosphor-svelte/lib/ExportIcon';
	import ImportIcon from 'phosphor-svelte/lib/DownloadSimpleIcon';
	import KeyboardIcon from 'phosphor-svelte/lib/KeyboardIcon';
	import { onDestroy } from 'svelte';
	import { ToggleGroup } from '$lib/components/ui/toggle-group';
	import { shortcuts, type FactionKey } from '$core/app/features/shortcuts';
	import { Button } from '$lib/components/ui/button';
	import { KeybindingRow } from '$lib/components/shortcuts';

	const factions: { label: string; value: FactionKey }[] = [
		{ label: 'USA', value: 'allies' },
		{ label: 'Brits', value: 'allies_commonwealth' },
		{ label: 'Werhmacht', value: 'axis' },
		{ label: 'Panzer Elite', value: 'axis_panzer_elite' }
	];

	let faction = $state<FactionKey>('allies');
	let keybindings = $derived(shortcuts.getBindings(faction));
	let sortableEl = $state<HTMLTableSectionElement | null>(null);
	let sortableInstance: Sortable | undefined;

	function destroySortable() {
		if (!sortableInstance) {
			return;
		}

		try {
			sortableInstance.destroy();
		} catch {
			// Sortable's element was already removed from the document.
		}

		sortableInstance = undefined;
	}

	$effect(() => {
		faction;
		sortableEl;
		const count = keybindings.length;

		if (!sortableEl || count === 0) {
			return destroySortable;
		}

		sortableInstance = Sortable.create(sortableEl, {
			handle: '.handle',
			draggable: '.item',
			animation: 150,
			onEnd: (event) => {
				if (event.oldIndex == null || event.newIndex == null || event.oldIndex === event.newIndex) {
					return;
				}

				shortcuts.moveBinding(faction, event.oldIndex, event.newIndex);
			}
		});

		return destroySortable;
	});

	onDestroy(() => {
		destroySortable();
		shortcuts.stopAllRecording();
	});
</script>

<div class="border-secondary-800 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b p-4">
	<ToggleGroup bind:value={faction} items={factions} class="w-fit" />
	<div class="flex flex-wrap gap-1">
		<Button variant="ghost" onclick={() => shortcuts.importSettings()}>
			<ImportIcon />
			Import
		</Button>
		<Button variant="ghost" onclick={() => shortcuts.exportSettings()}>
			<ExportIcon />
			Export
		</Button>
	</div>
</div>

<p class="text-secondary-400 border-secondary-800 border-b px-4 py-3 text-sm">
	Hotkeys are per faction and only work during an active match while Company of Heroes is focused
	(not in chat). Pick the tab that matches your army, then click a chord field to record keys.
</p>

<table class="w-full table-fixed">
	<colgroup>
		<col class="w-10" />
		<col class="w-[22%]" />
		<col />
		<col class="w-10" />
		<col />
		<col class="w-10" />
	</colgroup>
	{#if keybindings.length > 0}
		<thead>
			<tr
				class="bg-secondary-950/90 text-secondary-300 border-secondary-800 border-b text-left text-xs font-semibold tracking-wide uppercase"
			>
				<th class="px-2 py-3" aria-hidden="true"></th>
				<th class="px-4 py-3">Name</th>
				<th class="px-4 py-3">When you press</th>
				<th class="px-2 py-3" aria-hidden="true"></th>
				<th class="px-4 py-3">Game receives</th>
				<th class="px-2 py-3" aria-hidden="true"></th>
			</tr>
		</thead>
	{/if}
	<tbody bind:this={sortableEl}>
		{#if keybindings.length === 0}
			<tr>
				<td colspan="6" class="px-4 py-10">
					<div class="flex flex-col items-center gap-3 text-center">
						<KeyboardIcon class="text-secondary-600 size-10" weight="duotone" />
						<div>
							<p class="text-secondary-300 font-medium">No keybindings for this faction</p>
							<p class="text-secondary-500 mt-1 text-sm">
								Add a binding below, then record what you press and what the game should receive.
							</p>
						</div>
					</div>
				</td>
			</tr>
		{:else}
			{#each keybindings as keybinding (keybinding.id)}
				<KeybindingRow {keybinding} {faction} />
			{/each}
		{/if}
	</tbody>
</table>

<div class="border-secondary-800 border-t p-4">
	<Button variant="secondary" class="w-fit" onclick={() => shortcuts.addBinding(faction)}>
		<PlusIcon />
		Add keybinding
	</Button>
</div>
