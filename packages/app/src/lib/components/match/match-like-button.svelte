<script lang="ts">
	import { app } from '$core/app/context';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import { useI18n } from '$lib/i18n';
	import { resource, watch } from 'runed';
	import HeartIcon from 'phosphor-svelte/lib/HeartIcon';

	type Props = {
		lobbyId: string;
		likeCount?: number;
		onCountChange?: (count: number) => void;
	};

	let { lobbyId, likeCount = 0, onCountChange }: Props = $props();
	const { t } = useI18n();
	const myLike = resource(
		() => lobbyId,
		(id) => app.database.matchSocial.getMyLike(id)
	);

	let liked = $state(false);
	let count = $state(0);
	let toggling = $state(false);

	watch(
		() => myLike.current,
		(like) => {
			if (toggling) return;
			liked = !!like;
		}
	);

	watch(
		() => likeCount,
		(value) => {
			if (toggling) return;
			count = value ?? 0;
		}
	);

	async function toggle() {
		if (toggling) return;
		const nextLiked = !liked;
		liked = nextLiked;
		count = Math.max(0, count + (nextLiked ? 1 : -1));
		onCountChange?.(count);
		toggling = true;
		try {
			const result = await app.database.matchSocial.toggleLike(lobbyId);
			liked = result.liked;
		} catch {
			liked = !nextLiked;
			count = Math.max(0, count + (nextLiked ? -1 : 1));
			onCountChange?.(count);
			app.toast.error(t('Failed to update like.'));
		} finally {
			toggling = false;
		}
	}
</script>

<Button
	variant="ghost"
	onclick={toggle}
	disabled={toggling}
	aria-pressed={liked}
	aria-label={liked ? t('Unlike') : t('Like')}
	class={cn(
		'h-11 px-3',
		liked
			? 'text-primary hover:text-primary'
			: 'text-secondary-400 hover:text-white'
	)}
>
	<HeartIcon size={18} weight={liked ? 'fill' : 'duotone'} />
	<span class="tabular-nums">{count}</span>
</Button>
