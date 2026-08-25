<script lang="ts">
	import { untrack } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';

	type Props = {
		initialName: string;
		onSave: (name: string) => void | Promise<void>;
		onCancel: () => void;
	};

	let { initialName, onSave, onCancel }: Props = $props();
	let name = $state(untrack(() => initialName));
	let saving = $state(false);

	async function submit() {
		if (saving) return;
		saving = true;
		try {
			await onSave(name.trim());
		} finally {
			saving = false;
		}
	}
</script>

<form
	class="space-y-4"
	onsubmit={(event) => {
		event.preventDefault();
		void submit();
	}}
>
	<Input
		bind:value={name}
		placeholder="Replay name"
		aria-label="Replay name"
		disabled={saving}
		autofocus
	/>
	<div class="flex justify-end gap-2">
		<Button type="button" variant="secondary" disabled={saving} onclick={onCancel}>Cancel</Button>
		<Button type="submit" loading={saving}>Save</Button>
	</div>
</form>
