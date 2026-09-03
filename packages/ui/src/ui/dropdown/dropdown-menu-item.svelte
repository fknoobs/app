<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { cn } from '@company-of-heroes/ui/cn';
	import { dropdownItem } from '../../variants';

	type Props = DropdownMenu.ItemProps;

	let { children, ref = $bindable(null), ...restProps }: Props = $props();
</script>

<DropdownMenu.Item {...restProps} bind:ref class={cn(dropdownItem, restProps.class)}>
	{@render children?.()}
</DropdownMenu.Item>
