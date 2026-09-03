<script lang="ts">
	import { cn } from '@company-of-heroes/ui/cn';
	import ExclamationMarkIcon from 'phosphor-svelte/lib/ExclamationMarkIcon';

	type Props = {
		reason: string;
		label?: string;
		class?: string;
	};

	let { reason, label = 'Reason', class: className }: Props = $props();
</script>

<p class={cn('text-secondary-200 mt-2 mb-4 flex items-center gap-1.5', className)}>
	<ExclamationMarkIcon size={24} class="text-warning mt-0.5 shrink-0" weight="duotone" />
	<span class="min-w-0">
		<span class="font-semibold">{label}:</span>
		{reason}
	</span>
</p>
