<script lang="ts">
	import { cn } from '@company-of-heroes/ui/cn';
	import { Tabs, type TabsTriggerPropsWithoutHTML } from 'bits-ui';
	import { tabTrigger } from '../../variants';

	let { ...props }: TabsTriggerPropsWithoutHTML & { class?: string } = $props();
</script>

<Tabs.Trigger {...props} class={cn(tabTrigger, props.class)}>
	{@render props.children?.()}
</Tabs.Trigger>
