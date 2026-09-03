<script lang="ts">
	import { cn } from '@company-of-heroes/ui/cn';
	import { labelHex, sortPlayerLabels } from '../format/labels';
	import type { PlayerLabel } from '../format/types';

	type Props = {
		labels?: PlayerLabel[] | null;
		class?: string;
	};

	let { labels, class: className }: Props = $props();
	const ordered = $derived(sortPlayerLabels(labels ?? []));
</script>

{#if ordered.length > 0}
	<span class={cn('inline-flex min-w-0 flex-wrap items-center gap-1', className)}>
		{#each ordered as label (label.id)}
			{@const hex = labelHex(label.color)}
			<span
				class="inline-block w-fit rounded-md border px-2.5 py-0.5 text-xs font-medium"
				style:color={hex}
				style:border-color={`color-mix(in srgb, ${hex} 25%, transparent)`}
				style:background-color={`color-mix(in srgb, ${hex} 10%, transparent)`}
			>
				{label.name}
			</span>
		{/each}
	</span>
{/if}
