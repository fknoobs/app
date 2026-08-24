<script lang="ts">
	import { Tabs, type TabsListPropsWithoutHTML } from 'bits-ui';
	import { cn } from '$lib/utils';

	let { ...props }: TabsListPropsWithoutHTML = $props();
</script>

<Tabs.List {...props} class={cn('flex w-fit items-center justify-start gap-2 overflow-clip', props.class)}>
	{@render props.children?.()}
</Tabs.List>
