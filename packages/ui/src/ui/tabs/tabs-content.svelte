<script lang="ts">
	import { cn } from '@company-of-heroes/ui/cn';
	import { Tabs, type TabsContentPropsWithoutHTML } from 'bits-ui';

	let { ...props }: TabsContentPropsWithoutHTML & { class?: string } = $props();
</script>

<Tabs.Content {...props} class={cn('flex flex-col', props.class)}>
	{@render props.children?.()}
</Tabs.Content>
