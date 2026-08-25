<script lang="ts">
	import { Button } from '$lib/components/ui/button';

	type Props = {
		version?: string | null;
		onConfirm: () => void;
		onCancel: () => void;
	};

	let { version = null, onConfirm, onCancel }: Props = $props();
</script>

<div class="space-y-4">
	<div class="text-secondary-300 space-y-3 text-sm leading-relaxed">
		<p>
			The <span class="text-secondary-100 font-medium">Opponent Bot (oppbot)</span> overlay has a new
			version{#if version}&nbsp;(<span class="text-secondary-100 font-medium">{version}</span>){/if}.
		</p>
		<p>
			Choose <span class="text-secondary-100 font-medium">Update</span> to install the latest default
			overlay. Your current overlay folder is backed up first, so any custom edits stay recoverable.
		</p>
		<p>
			If you customized the overlay and want to keep those files as-is for now, choose
			<span class="text-secondary-100 font-medium">Not now</span>. You will be asked again the next
			time a newer oppbot version ships.
		</p>
	</div>

	<div class="flex justify-end gap-2">
		<Button type="button" variant="secondary" onclick={onCancel}>Not now</Button>
		<Button type="button" onclick={onConfirm}>Update</Button>
	</div>
</div>
