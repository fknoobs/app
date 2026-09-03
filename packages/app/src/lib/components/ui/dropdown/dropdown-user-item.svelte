<script lang="ts">
	import UserImage from '$lib/components/user/user-image.svelte';
	import type { UserAvatarRecord } from '$lib/components/user/user-avatar-src';
	import { cn } from '@company-of-heroes/ui/cn';
	import { dropdownItem } from '@company-of-heroes/ui/variants';
	import { watch } from 'runed';
	import type { ComponentProps } from 'svelte';
	import { Item as DropdownMenuItem } from '@company-of-heroes/ui/dropdown';

	type Props = ComponentProps<typeof DropdownMenuItem> & {
		user: UserAvatarRecord;
		highlighted?: boolean;
	};

	let { user, children, class: className, highlighted = false, ...restProps }: Props = $props();
	let itemEl = $state<HTMLElement | null>(null);

	watch(
		() => [highlighted, itemEl] as const,
		([isHighlighted, el]: readonly [boolean, HTMLElement | null]) => {
			if (isHighlighted && el) {
				el.scrollIntoView({ block: 'nearest' });
			}
		}
	);
</script>

<DropdownMenuItem
	{...restProps}
	bind:ref={itemEl}
	class={cn(dropdownItem, 'flex items-center gap-2 text-xs', className)}
>
	<UserImage {user} class="size-5 shrink-0" />
	<span class="text-primary min-w-0 truncate">@{user.name}</span>
	{@render children?.()}
</DropdownMenuItem>
