<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/input';
	import { mePlayerText } from '$lib/components/ui/variants';
	import { app } from '$core/app/context';
	import * as User from '$lib/components/user';
	import { useI18n } from '$lib/i18n';
	import { cn } from '$lib/utils';
	import {
		COMMENT_MAX_LENGTH,
		toggleMarkdownQuote,
		wrapMarkdownLink,
		wrapMarkdownSelection,
		type MarkdownSelectionEdit
	} from '$lib/utils/markdown';
	import { tick } from 'svelte';
	import CodeIcon from 'phosphor-svelte/lib/CodeIcon';
	import HighlighterIcon from 'phosphor-svelte/lib/HighlighterIcon';
	import LinkIcon from 'phosphor-svelte/lib/LinkIcon';
	import PaperPlaneTiltIcon from 'phosphor-svelte/lib/PaperPlaneTiltIcon';
	import QuotesIcon from 'phosphor-svelte/lib/QuotesIcon';
	import TextBIcon from 'phosphor-svelte/lib/TextBIcon';
	import TextItalicIcon from 'phosphor-svelte/lib/TextItalicIcon';
	import TextStrikethroughIcon from 'phosphor-svelte/lib/TextStrikethroughIcon';
	import XIcon from 'phosphor-svelte/lib/XIcon';

	type Props = {
		value?: string;
		posting?: boolean;
		name?: string;
		placeholder?: string;
		submitLabel?: string;
		autofocus?: boolean;
		rows?: number;
		class?: string;
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
		onpost,
		oncancel
	}: Props = $props();
	const { t } = useI18n();
	let composerEl: HTMLTextAreaElement | undefined;
	const canPost = $derived(value.trim().length > 0 && !posting);
	const formatBtn = 'text-secondary-400 hover:text-white size-7';

	function grow(event: Event) {
		resize(event.currentTarget as HTMLTextAreaElement);
	}

	function resize(el: HTMLTextAreaElement) {
		el.style.height = 'auto';
		el.style.height = `${el.scrollHeight}px`;
	}

	function composer() {
		return composerEl ?? null;
	}

	function bindComposer(el: HTMLTextAreaElement) {
		composerEl = el;
		resize(el);
		return () => {
			if (composerEl === el) composerEl = undefined;
		};
	}

	async function applyFormat(edit: MarkdownSelectionEdit | null) {
		if (!edit || posting) return;
		value = edit.text;
		await tick();
		const el = composer();
		if (!el) return;
		el.focus();
		el.setSelectionRange(edit.selectStart, edit.selectEnd);
		resize(el);
	}

	function wrap(before: string, after: string, placeholderText: string) {
		const el = composer();
		if (!el) return;
		void applyFormat(
			wrapMarkdownSelection(value, el.selectionStart, el.selectionEnd, before, after, placeholderText)
		);
	}

	function formatCode() {
		const el = composer();
		if (!el) return;
		const selected = value.slice(el.selectionStart, el.selectionEnd);
		if (selected.includes('\n')) wrap('```\n', '\n```', 'code');
		else wrap('`', '`', 'code');
	}

	function formatLink() {
		const el = composer();
		if (!el) return;
		void applyFormat(wrapMarkdownLink(value, el.selectionStart, el.selectionEnd));
	}

	function formatQuote() {
		const el = composer();
		if (!el) return;
		void applyFormat(toggleMarkdownQuote(value, el.selectionStart, el.selectionEnd));
	}

	function onComposerKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && oncancel && !posting) {
			event.preventDefault();
			oncancel();
			return;
		}
		if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
		if (event.key === 'Enter') {
			event.preventDefault();
			onpost();
			return;
		}
		if (event.key === 'b' || event.key === 'B') {
			event.preventDefault();
			wrap('**', '**', 'bold');
			return;
		}
		if (event.key === 'i' || event.key === 'I') {
			event.preventDefault();
			wrap('*', '*', 'italic');
			return;
		}
		if (event.key === 'k' || event.key === 'K') {
			event.preventDefault();
			formatLink();
		}
	}
</script>

<form
	class={cn('border-secondary-800 bg-secondary-800/30 flex flex-col border-t', className)}
	onsubmit={(event) => {
		event.preventDefault();
		onpost();
	}}
>
	<div class="px-4 pt-3">
		{#if name}
			{#if app.account.user}
				<User.Root user={app.account.user}>
					<User.Name class={cn(mePlayerText, 'font-semibold')} />
				</User.Root>
			{:else}
				<span class={cn(mePlayerText, 'font-semibold')}>{name}</span>
			{/if}
		{/if}
		<Textarea
			flush
			{@attach bindComposer}
			bind:value
			{rows}
			{autofocus}
			maxlength={COMMENT_MAX_LENGTH}
			disabled={posting}
			placeholder={placeholder ?? t('Write a comment')}
			aria-label={placeholder ?? t('Write a comment')}
			onkeydown={onComposerKeydown}
			oninput={grow}
			class={cn('min-h-14 resize-none text-sm', name && 'mt-1 min-h-18')}
		/>
	</div>
	<div class="border-secondary-800 flex items-stretch border-t">
		<div
			role="toolbar"
			aria-label={t('Formatting')}
			tabindex="-1"
			class="flex min-w-0 flex-1 flex-wrap items-center px-2 py-1"
			onmousedown={(event) => event.preventDefault()}
		>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				class={formatBtn}
				disabled={posting}
				aria-label={t('Bold')}
				title={t('Bold')}
				onclick={() => wrap('**', '**', 'bold')}
			>
				<TextBIcon size={16} />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				class={formatBtn}
				disabled={posting}
				aria-label={t('Italic')}
				title={t('Italic')}
				onclick={() => wrap('*', '*', 'italic')}
			>
				<TextItalicIcon size={16} />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				class={formatBtn}
				disabled={posting}
				aria-label={t('Strikethrough')}
				title={t('Strikethrough')}
				onclick={() => wrap('~~', '~~', 'text')}
			>
				<TextStrikethroughIcon size={16} />
			</Button>
			<span class="bg-secondary-800 mx-0.5 h-4 w-px"></span>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				class={formatBtn}
				disabled={posting}
				aria-label={t('Code')}
				title={t('Code')}
				onclick={formatCode}
			>
				<CodeIcon size={16} />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				class={formatBtn}
				disabled={posting}
				aria-label={t('Link')}
				title={t('Link')}
				onclick={formatLink}
			>
				<LinkIcon size={16} />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				class={formatBtn}
				disabled={posting}
				aria-label={t('Highlight')}
				title={t('Highlight')}
				onclick={() => wrap('==', '==', 'text')}
			>
				<HighlighterIcon size={16} />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				class={formatBtn}
				disabled={posting}
				aria-label={t('Quote')}
				title={t('Quote')}
				onclick={formatQuote}
			>
				<QuotesIcon size={16} />
			</Button>
		</div>
		{#if oncancel}
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				class="text-secondary-400 hover:text-white hover:bg-primary/10 h-auto w-10 shrink-0 self-stretch rounded-none border-y-0 border-r-0 border-l border-secondary-800"
				disabled={posting}
				aria-label={t('Cancel')}
				onclick={oncancel}
			>
				<XIcon size={16} />
			</Button>
		{/if}
		<Button
			type="submit"
			variant="ghost"
			size="icon-sm"
			class="text-primary hover:bg-primary/10 h-auto w-10 shrink-0 self-stretch rounded-none border-y-0 border-r-0 border-l border-secondary-800"
			disabled={!canPost}
			loading={posting}
			aria-label={submitLabel ?? t('Post comment')}
		>
			<PaperPlaneTiltIcon size={16} weight="fill" />
		</Button>
	</div>
</form>
