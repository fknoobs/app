<script lang="ts">
	import type { LobbyComment } from '$core/app/database/match-social';
	import { app } from '$core/app/context';
	import MatchCommentComposer from './match-comment-composer.svelte';
	import { Button } from '$lib/components/ui/button';
	import { useI18n } from '$lib/i18n';
	import { cn } from '$lib/utils';
	import { renderMarkdown } from '$lib/utils/markdown';
	import { mePlayerText, footerAction } from '$lib/components/ui/variants';
	import { resource, watch } from 'runed';
	import * as User from '$lib/components/user';
	import type { UsersResponse } from '$core/pocketbase/types';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import dayjs from '$lib/dayjs';
	import ArrowBendUpLeftIcon from 'phosphor-svelte/lib/ArrowBendUpLeftIcon';
	import CaretDownIcon from 'phosphor-svelte/lib/CaretDownIcon';
	import HeartIcon from 'phosphor-svelte/lib/HeartIcon';
	import PencilSimpleIcon from 'phosphor-svelte/lib/PencilSimpleIcon';
	import TrashIcon from 'phosphor-svelte/lib/TrashIcon';

	type Props = {
		lobbyId: string;
		highlightCommentId?: string;
		class?: string;
	};

	type CommentNode = {
		comment: LobbyComment;
		children: CommentNode[];
	};

	type RepliesToggle = {
		count: number;
		open: boolean;
		ontoggle: () => void;
	};

	let { lobbyId, highlightCommentId, class: className }: Props = $props();
	const { t } = useI18n();
	const comments = resource(
		() => lobbyId,
		(id) => app.database.matchSocial.listComments(id)
	);

	let draft = $state('');
	let posting = $state(false);
	let composerNonce = $state(0);
	let deletingId = $state<string | null>(null);
	let likingId = $state<string | null>(null);
	let editingId = $state<string | null>(null);
	let editDraft = $state('');
	let saving = $state(false);
	let replyTo = $state<string | null>(null);
	let replyDraft = $state('');
	let replyPosting = $state(false);
	let threadCollapsed = $state<Record<string, boolean>>({});
	let activeHighlightId = $state<string | null>(null);
	let focusedHighlightId = $state<string | null>(null);
	const items = $derived(comments.current ?? []);
	const tree = $derived(buildTree(items));
	const myName = $derived(app.account.user?.name || t('Player'));

	const markdownClass = cn(
		'prose prose-sm max-w-none min-w-0 break-words text-secondary-200',
		'prose-headings:my-1 prose-headings:text-sm prose-headings:leading-snug prose-headings:text-white',
		'prose-h1:text-base prose-strong:text-white',
		'prose-code:bg-secondary-800 prose-code:text-primary prose-code:rounded prose-code:px-1 prose-code:py-0.5',
		'prose-code:before:content-none prose-code:after:content-none',
		'prose-pre:my-1 prose-pre:overflow-x-auto prose-pre:bg-secondary-900 prose-pre:border-secondary-800 prose-pre:border',
		'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
		'prose-blockquote:border-secondary-700 prose-blockquote:text-primary',
		'prose-li:marker:text-secondary-400',
		'[&_mark]:bg-primary/20 [&_mark]:text-primary [&_mark]:rounded-sm',
		'prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-blockquote:my-1',
		'[&>*:first-child]:mt-0 [&>*:last-child]:mb-0'
	);

	function parentId(comment: LobbyComment) {
		const parent = comment.parent as unknown;
		if (!parent) return '';
		if (typeof parent === 'object' && 'id' in parent) return String((parent as { id: string }).id);
		return String(parent);
	}

	function buildTree(list: LobbyComment[]): CommentNode[] {
		const ids: Record<string, true> = {};
		for (const item of list) ids[item.id] = true;
		const byParent: Record<string, LobbyComment[]> = {};
		for (const comment of list) {
			const parent = parentId(comment);
			const key = parent && ids[parent] ? parent : '';
			(byParent[key] ??= []).push(comment);
		}
		function nodes(key: string): CommentNode[] {
			return (byParent[key] ?? []).map((comment) => ({
				comment,
				children: nodes(comment.id)
			}));
		}
		return nodes('');
	}

	function authorRecord(comment: LobbyComment) {
		const user = comment.user as unknown;
		if (user && typeof user === 'object' && 'id' in user) {
			return user as UsersResponse<Record<string, any>, string[]>;
		}
		return null;
	}

	function authorId(comment: LobbyComment) {
		const user = comment.user as unknown;
		if (user && typeof user === 'object' && 'id' in user) {
			return String((user as { id: string }).id);
		}
		return typeof comment.user === 'string' ? comment.user : '';
	}

	function authorName(comment: LobbyComment) {
		const user = comment.user as { name?: string } | string | undefined;
		if (user && typeof user === 'object' && user.name) return user.name;
		return t('Player');
	}

	function canManage(comment: LobbyComment) {
		return authorId(comment) === app.account.userId || app.account.isStaff;
	}

	function patchComment(id: string, patch: Partial<LobbyComment>) {
		comments.mutate(
			(comments.current ?? []).map((item) => (item.id === id ? { ...item, ...patch } : item))
		);
	}

	function toggleReply(id: string) {
		if (replyTo === id) {
			replyTo = null;
			replyDraft = '';
			return;
		}
		cancelEdit();
		replyTo = id;
		replyDraft = '';
	}

	function startEdit(comment: LobbyComment) {
		if (editingId === comment.id) {
			cancelEdit();
			return;
		}
		replyTo = null;
		replyDraft = '';
		editingId = comment.id;
		editDraft = comment.text;
	}

	function cancelEdit() {
		if (saving) return;
		editingId = null;
		editDraft = '';
	}

	function countReplies(node: CommentNode): number {
		let n = 0;
		for (const child of node.children) n += 1 + countReplies(child);
		return n;
	}

	function threadOpen(id: string, childDepth: number) {
		if (threadCollapsed[id] === undefined) return childDepth <= 1;
		return !threadCollapsed[id];
	}

	function toggleThread(id: string, childDepth: number) {
		threadCollapsed[id] = threadOpen(id, childDepth);
	}

	function expandAncestors(targetId: string) {
		const all = comments.current ?? [];
		const next = { ...threadCollapsed };
		let current = targetId;
		while (current) {
			const item = all.find((comment) => comment.id === current);
			if (!item) break;
			const parent = parentId(item);
			if (!parent) break;
			next[parent] = false;
			current = parent;
		}
		threadCollapsed = next;
	}

	function clearCommentQuery() {
		if (!page.url.searchParams.has('comment')) return;
		const url = new URL(page.url.href);
		url.searchParams.delete('comment');
		replaceState(`${url.pathname}${url.search}${url.hash}`, page.state);
	}

	watch(
		() => ({
			target: highlightCommentId,
			list: items,
			loading: comments.loading
		}),
		({ target, list, loading }) => {
			if (!target || loading) return;
			if (!list.some((comment) => comment.id === target)) return;
			if (focusedHighlightId === target) return;
			focusedHighlightId = target;
			expandAncestors(target);
			activeHighlightId = target;
			const scrollTimeout = window.setTimeout(() => {
				document
					.getElementById(`comment-${target}`)
					?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}, 50);
			clearCommentQuery();
			const timeout = window.setTimeout(() => {
				if (activeHighlightId === target) activeHighlightId = null;
			}, 3000);
			return () => {
				clearTimeout(scrollTimeout);
				clearTimeout(timeout);
			};
		}
	);

	async function submit() {
		const text = draft.trim();
		if (!text || posting) return;
		posting = true;
		try {
			const created = await app.database.matchSocial.createComment(lobbyId, text);
			draft = '';
			composerNonce += 1;
			comments.mutate([...(comments.current ?? []), created]);
		} catch {
			app.toast.error(t('Failed to post comment.'));
		} finally {
			posting = false;
		}
	}

	async function submitReply() {
		const parent = replyTo;
		const text = replyDraft.trim();
		if (!parent || !text || replyPosting) return;
		replyPosting = true;
		try {
			const created = await app.database.matchSocial.createComment(lobbyId, text, parent);
			replyDraft = '';
			replyTo = null;
			threadCollapsed[parent] = false;
			comments.mutate([...(comments.current ?? []), created]);
		} catch {
			app.toast.error(t('Failed to post comment.'));
		} finally {
			replyPosting = false;
		}
	}

	async function toggleLike(comment: LobbyComment) {
		if (likingId) return;
		const nextLiked = !comment.liked;
		const prevLiked = comment.liked;
		const prevCount = comment.likeCount ?? 0;
		const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));
		likingId = comment.id;
		patchComment(comment.id, { liked: nextLiked, likeCount: nextCount });
		try {
			const result = await app.database.matchSocial.toggleCommentLike(comment.id);
			patchComment(comment.id, { liked: result.liked, likeCount: result.likeCount });
		} catch {
			patchComment(comment.id, { liked: prevLiked, likeCount: prevCount });
			app.toast.error(t('Failed to update like.'));
		} finally {
			likingId = null;
		}
	}

	async function saveEdit() {
		const id = editingId;
		const text = editDraft.trim();
		if (!id || !text || saving) return;
		saving = true;
		try {
			const updated = await app.database.matchSocial.updateComment(id, text);
			const previous = (comments.current ?? []).find((item) => item.id === id);
			patchComment(id, {
				text: updated.text,
				updated: updated.updated,
				liked: previous?.liked ?? false,
				likeCount: previous?.likeCount ?? updated.likeCount
			});
			editingId = null;
			editDraft = '';
		} catch {
			app.toast.error(t('Failed to update comment.'));
		} finally {
			saving = false;
		}
	}

	function descendantIds(id: string, list: LobbyComment[]) {
		const drop: Record<string, true> = { [id]: true };
		let grew = true;
		while (grew) {
			grew = false;
			for (const item of list) {
				const parent = parentId(item);
				if (parent && drop[parent] && !drop[item.id]) {
					drop[item.id] = true;
					grew = true;
				}
			}
		}
		return drop;
	}

	async function remove(comment: LobbyComment) {
		if (deletingId) return;
		deletingId = comment.id;
		try {
			await app.database.matchSocial.deleteComment(comment.id);
			const all = comments.current ?? [];
			const drop = descendantIds(comment.id, all);
			if (replyTo && drop[replyTo]) {
				replyTo = null;
				replyDraft = '';
			}
			if (editingId && drop[editingId]) cancelEdit();
			comments.mutate(all.filter((item) => !drop[item.id]));
		} catch {
			app.toast.error(t('Failed to delete comment.'));
		} finally {
			deletingId = null;
		}
	}
</script>

<section class={cn('border-secondary-800 border-t', className)}>
	<div class="border-secondary-800 flex items-center gap-2 border-b px-4 py-2.5">
		<h2 class="font-bold text-white">{t('Comments')}</h2>
		{#if items.length > 0}
			<span class="bg-secondary-800 text-secondary-400 px-1.5 py-0.5 text-xs tabular-nums">
				{items.length}
			</span>
		{/if}
	</div>

	<div class="bg-secondary-950/50 flex flex-col">
		{#if comments.loading && items.length === 0}
			<p class="text-secondary-400 px-4 py-4 text-sm">{t('Loading...')}</p>
		{:else if items.length === 0}
			<p class="text-secondary-400 px-4 py-4 text-sm">{t('No comments yet.')}</p>
		{:else}
			{#each tree as node (node.comment.id)}
				<div class="border-secondary-800 border-b last:border-b-0">
					{@render commentBlock(node, 0)}
				</div>
			{/each}
		{/if}
	</div>

	{#key composerNonce}
		<MatchCommentComposer bind:value={draft} {posting} name={myName} onpost={() => void submit()} />
	{/key}
</section>

{#snippet replyComposer()}
	<MatchCommentComposer
		class="border-t-0"
		bind:value={replyDraft}
		posting={replyPosting}
		rows={2}
		placeholder={t('Write a reply')}
		onpost={() => void submitReply()}
	/>
{/snippet}

{#snippet commentBlock(node: CommentNode, depth: number)}
	{@const open = threadOpen(node.comment.id, depth + 1)}
	{@const replyCount = countReplies(node)}
	{@render commentRow(
		node.comment,
		depth > 0,
		replyCount > 0
			? {
					count: replyCount,
					open,
					ontoggle: () => toggleThread(node.comment.id, depth + 1)
				}
			: undefined
	)}
	{#if replyTo === node.comment.id}
		{@render replyComposer()}
	{/if}
	{#if replyCount > 0 && open}
		{@render thread(node.children, depth + 1)}
	{/if}
{/snippet}

{#snippet thread(nodes: CommentNode[], depth: number)}
	{#if nodes.length > 0}
		<div class={cn(depth <= 4 && 'border-secondary-800 ml-4 border-l')}>
			{#each nodes as node (node.comment.id)}
				{@render commentBlock(node, depth)}
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet commentRow(comment: LobbyComment, nested: boolean, replies?: RepliesToggle)}
	{@const mine = authorId(comment) === app.account.userId}
	{@const editing = editingId === comment.id}
	{@const author = authorRecord(comment)}
	<div
		id={`comment-${comment.id}`}
		class={cn(
			'scroll-mt-24 transition-colors duration-500',
			activeHighlightId === comment.id && 'bg-primary/15'
		)}
	>
		<div class={cn(nested ? 'px-3 pt-2.5 pb-1.5' : 'px-4 pt-3.5 pb-2')}>
			<div class="flex min-w-0 flex-wrap items-center gap-2">
				{#if author}
					<User.Root user={author}>
						<User.Name class={cn('shrink-0 font-semibold', mine ? mePlayerText : 'text-white')} />
					</User.Root>
				{:else}
					<span class={cn('shrink-0 font-semibold', mine ? mePlayerText : 'text-white')}>
						{authorName(comment)}
					</span>
				{/if}
				<time
					class="text-secondary-500 text-xs whitespace-nowrap tabular-nums"
					datetime={comment.created}
				>
					{dayjs(comment.created).format('DD MMM, HH:mm')}
				</time>
			</div>
			{#if !editing}
				<div class={cn(markdownClass, 'mt-1.5')}>
					{@html renderMarkdown(comment.text)}
				</div>
			{/if}
		</div>
		{#if editing}
			<MatchCommentComposer
				bind:value={editDraft}
				posting={saving}
				rows={2}
				autofocus
				placeholder={t('Edit comment')}
				submitLabel={t('Save comment')}
				onpost={() => void saveEdit()}
				oncancel={cancelEdit}
			/>
		{:else}
			<div
				class={cn(
					'border-secondary-800 bg-secondary-800/40 flex items-stretch border-t',
					replyTo === comment.id && 'border-b'
				)}
			>
				<Button
					type="button"
					variant="ghost"
					class={cn(
						footerAction,
						comment.liked ? 'text-primary hover:text-primary' : 'text-secondary-400 hover:text-white'
					)}
					onclick={() => void toggleLike(comment)}
					disabled={!!likingId}
					aria-pressed={comment.liked}
					aria-label={comment.liked ? t('Unlike') : t('Like')}
				>
					<HeartIcon size={16} weight={comment.liked ? 'fill' : 'duotone'} />
					<span class="tabular-nums">{comment.likeCount ?? 0}</span>
				</Button>
				<Button
					type="button"
					variant="ghost"
					class={cn(
						footerAction,
						replyTo === comment.id
							? 'text-primary hover:text-primary'
							: 'text-secondary-400 hover:text-white'
					)}
					onclick={() => toggleReply(comment.id)}
					aria-pressed={replyTo === comment.id}
					aria-label={t('Reply')}
				>
					<ArrowBendUpLeftIcon size={16} />
					{t('Reply')}
				</Button>
				{#if canManage(comment)}
					<Button
						type="button"
						variant="ghost"
						class={cn(footerAction, 'text-secondary-400 hover:text-white')}
						onclick={() => startEdit(comment)}
						aria-label={t('Edit comment')}
					>
						<PencilSimpleIcon size={16} />
						{t('Edit')}
					</Button>
					<Button
						type="button"
						variant="ghost"
						class={cn(
							footerAction,
							'text-secondary-400 hover:text-destructive',
							!replies && 'border-r-0'
						)}
						onclick={() => void remove(comment)}
						disabled={deletingId === comment.id}
						aria-label={t('Delete comment')}
					>
						<TrashIcon size={16} />
						{t('Delete')}
					</Button>
				{/if}
				{#if replies}
					<Button
						type="button"
						variant="ghost"
						class={cn(
							'hover:bg-primary/10 h-auto min-h-8 min-w-0 flex-1 justify-start rounded-none border-0 px-3 text-xs',
							replies.open ? 'text-primary hover:text-primary' : 'text-secondary-400 hover:text-white'
						)}
						onclick={replies.ontoggle}
						aria-expanded={replies.open}
						aria-label={replies.open ? t('Hide replies') : t('Show replies')}
					>
						<CaretDownIcon
							size={14}
							class={cn('shrink-0 transition-transform', !replies.open && '-rotate-90')}
						/>
						{replies.count === 1
							? t('1 reply')
							: t('{count} replies', { count: replies.count })}
					</Button>
				{/if}
			</div>
		{/if}
	</div>
{/snippet}
