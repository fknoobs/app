<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ContextMenu } from 'bits-ui';
	import { cn } from '$lib/utils';
	import { surfaceOverlay } from '../variants';

	type Props = ContextMenu.RootProps & {
		trigger: Snippet<[{ props: ContextMenu.TriggerProps }]>;
	};

	let { children, trigger, ...restProps }: Props = $props();
</script>

<ContextMenu.Root {...restProps}>
	<ContextMenu.Trigger>
		{#snippet child({ props })}
			{@render trigger({ props })}
		{/snippet}
	</ContextMenu.Trigger>
	<ContextMenu.Portal>
		<ContextMenu.Content class={cn(surfaceOverlay, 'z-50 p-1 shadow-lg')}>
			{@render children?.()}
		</ContextMenu.Content>
	</ContextMenu.Portal>
</ContextMenu.Root>
