<script lang="ts">
	import { cn } from '@company-of-heroes/ui/cn';
	import { Tabs, type TabsRootPropsWithoutHTML } from 'bits-ui';

	let {
		class: className,
		children,
		...restProps
	}: TabsRootPropsWithoutHTML & { class?: string } = $props();
</script>

<Tabs.Root {...restProps} class={cn('flex flex-col', className)}>
	{@render children?.()}
</Tabs.Root>
