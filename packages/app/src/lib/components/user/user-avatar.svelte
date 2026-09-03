<script lang="ts">
	import * as Dropdown from '$lib/components/ui/dropdown';
	import { dropdownItemIcon } from '@company-of-heroes/ui/variants';
	import { Avatar } from 'bits-ui';
	import { useUser } from '.';
	import { userAvatarSrc } from './user-avatar-src';
	import UserIcon from 'phosphor-svelte/lib/UserIcon';
	import { goto } from '$app/navigation';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	let user = useUser();
	let avatar = $derived(
		userAvatarSrc({
			id: user.id ?? '',
			name: user.name,
			avatar: user.avatar,
			collectionId: user.collectionId,
			collectionName: user.collectionName
		})
	);
</script>

<Avatar.Root class="flex items-center justify-center rounded-full">
	<Dropdown.Root align="end" class="w-56">
		{#snippet trigger({ props })}
			<button type="button" class="cursor-pointer rounded-full" {...props}>
				<Avatar.Image src={avatar} alt={`@${user.name}`} class="rounded-full" />
			</button>
		{/snippet}
		<Dropdown.Subheader>
			<p class="truncate font-medium text-white">{user.name}</p>
			{#if user.email}
				<p class="text-secondary-400 truncate text-xs">{user.email}</p>
			{/if}
		</Dropdown.Subheader>
		<Dropdown.Item class={dropdownItemIcon} onSelect={() => goto(`/players/${user.steamIds[0]}`)}>
			<UserIcon size={18} weight="duotone" class="text-primary shrink-0" />
			{t('View Profile')}
		</Dropdown.Item>
	</Dropdown.Root>
</Avatar.Root>
