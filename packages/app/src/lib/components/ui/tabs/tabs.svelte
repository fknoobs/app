<script lang="ts">
	import { cn } from '$lib/utils';
	import { Tabs, type TabsRootPropsWithoutHTML } from 'bits-ui';

	let { ...props }: TabsRootPropsWithoutHTML = $props();
</script>

<Tabs.Root {...props} class={cn('flex flex-col', props.class)}>
	{@render props.children?.()}
</Tabs.Root>
