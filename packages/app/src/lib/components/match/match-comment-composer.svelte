<script lang="ts">
	import { CommentComposer, type MentionUser as ComposerMentionUser } from '@company-of-heroes/ui/comment';
	import { app } from '$core/app/context';
	import * as User from '$lib/components/user';
	import { userAvatarSrc } from '$lib/components/user/user-avatar-src';
	import { mePlayerText } from '$lib/components/ui/variants';
	import type { MentionUser } from '$core/app/database/match-social';
	import { useI18n } from '$lib/i18n';
	import { cn } from '$lib/utils';

	type Props = {
		value?: string;
		posting?: boolean;
		name?: string;
		placeholder?: string;
		submitLabel?: string;
		autofocus?: boolean;
		rows?: number;
		class?: string;
		people?: MentionUser[];
		onpost: () => void;
		oncancel?: () => void;
	};

	let {
		value = $bindable(''),
		posting = false,
		name,
		placeholder,
		submitLabel,
		autofocus = false,
		rows = 3,
		class: className,
		people = [],
		onpost,
		oncancel
	}: Props = $props();

	const { t } = useI18n();
	const mentionPeople = $derived(people.map(toComposerUser));

	function toComposerUser(user: MentionUser): ComposerMentionUser {
		return {
			id: user.id,
			name: user.name,
			avatarUrl: userAvatarSrc(user),
			steamIds: user.steamIds
		};
	}

	function searchMentions(query: string) {
		return app.database.matchSocial.searchMentionUsers(query).then((users) => users.map(toComposerUser));
	}
</script>

<CommentComposer
	bind:value
	{posting}
	{autofocus}
	{rows}
	{name}
	class={className}
	people={mentionPeople}
	excludeUserId={app.account.userId}
	{searchMentions}
	placeholder={placeholder ?? t('Write a comment')}
	submitLabel={submitLabel ?? t('Send')}
	searchingLabel={t('Searching...')}
	noUsersLabel={t('No users found.')}
	mentionHintLabel={t('Type a name to mention someone.')}
	formattingLabel={t('Formatting')}
	boldLabel={t('Bold')}
	italicLabel={t('Italic')}
	strikethroughLabel={t('Strikethrough')}
	codeLabel={t('Code')}
	linkLabel={t('Link')}
	highlightLabel={t('Highlight')}
	quoteLabel={t('Quote')}
	mentionLabel={t('Mention')}
	cancelLabel={t('Cancel')}
	{onpost}
	{oncancel}
>
	{#snippet identity()}
		{#if name}
			<div class="flex items-center gap-2">
				{#if app.account.user}
					<User.Root user={app.account.user} class="flex items-center gap-2">
						<User.Image user={app.account.user} class="size-8 shrink-0" />
						<User.Name class={cn(mePlayerText, 'font-semibold')} />
					</User.Root>
				{:else}
					<span class={cn(mePlayerText, 'font-semibold')}>{name}</span>
				{/if}
			</div>
		{/if}
	{/snippet}
</CommentComposer>
