<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Avatar } from 'bits-ui';
	import { Button } from '@company-of-heroes/ui/button';
	import HeaderMenu from '$lib/components/layout/header-menu.svelte';
	import { authDisplayName } from '$lib/auth/user';
	import { cn } from '$lib/utils/cn';
	import {
		dropdownItem,
		dropdownItemIcon,
		dropdownSubheader,
		headerCellAction
	} from '$lib/utils/variants';
	import { href, useI18n } from '$lib/i18n';
	import SignOutIcon from 'phosphor-svelte/lib/SignOutIcon';
	import UserIcon from 'phosphor-svelte/lib/UserIcon';

	const { t } = useI18n();
	const user = $derived(page.data.user);
	const isLoggedIn = $derived(user !== null);
	const avatarSrc = $derived(user?.avatarUrl);
	const displayName = $derived(user ? authDisplayName(user) : '');
	const profileHref = $derived(
		user?.steamIds?.[0] ? href(`/players/${user.steamIds[0]}`) : undefined
	);

	let logoutForm: HTMLFormElement | undefined;
</script>

<form
	bind:this={logoutForm}
	method="POST"
	action={href('/logout')}
	class="hidden"
	use:enhance={() => {
		return async ({ result, update }) => {
			if (result.type === 'redirect') {
				window.location.assign(result.location);
				return;
			}

			await update();
		};
	}}
></form>

{#if isLoggedIn && user}
	<HeaderMenu align="end" triggerClass={cn(headerCellAction, 'gap-2 px-4')} panelClass="w-56">
		{#snippet trigger()}
			<Avatar.Root class="bg-secondary-800 size-8 shrink-0 overflow-hidden rounded-full">
				{#if avatarSrc}
					<Avatar.Image src={avatarSrc} alt="" class="size-full object-cover" />
				{:else}
					<Avatar.Fallback
						class="text-secondary-400 flex size-full items-center justify-center text-xs"
					>
						{displayName.slice(0, 1).toUpperCase()}
					</Avatar.Fallback>
				{/if}
			</Avatar.Root>
			<span class="hidden max-w-32 truncate text-sm font-medium text-white sm:inline">
				{displayName}
			</span>
		{/snippet}
		{#snippet children({ close })}
			<div class={dropdownSubheader}>
				<p class="truncate font-medium text-white">{displayName}</p>
				<p class="text-secondary-400 truncate text-xs">{user.email}</p>
			</div>
			{#if profileHref}
				<button
					type="button"
					role="menuitem"
					class={cn(dropdownItem, dropdownItemIcon, 'flex w-full')}
					onclick={() => {
						close();
						void goto(profileHref);
					}}
				>
					<UserIcon size={18} weight="duotone" class="text-primary shrink-0" />
					{t('View profile')}
				</button>
			{/if}
			<button
				type="button"
				role="menuitem"
				class={cn(dropdownItem, dropdownItemIcon, 'flex w-full')}
				onclick={() => {
					close();
					logoutForm?.requestSubmit();
				}}
			>
				<SignOutIcon size={18} weight="duotone" class="text-primary shrink-0" />
				{t('Log out')}
			</button>
		{/snippet}
	</HeaderMenu>
{:else}
	<Button href={href('/login')} variant="ghost" class={headerCellAction}>{t('Log in')}</Button>
{/if}
