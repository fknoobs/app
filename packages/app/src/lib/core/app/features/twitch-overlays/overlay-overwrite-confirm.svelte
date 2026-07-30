<script lang="ts">
	import { Button } from '$lib/components/ui/button';

	type Props = {
		onConfirm: () => void;
		onCancel: () => void;
	};

	let { onConfirm, onCancel }: Props = $props();
</script>

<div class="flex justify-end gap-2">
	<Button type="button" variant="secondary" onclick={onCancel}>Cancel</Button>
	<Button type="button" onclick={onConfirm}>Overwrite</Button>
</div>
