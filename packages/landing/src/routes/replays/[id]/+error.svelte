<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { interactive } from '$lib/variants';
	import { cn } from '$lib/cn';
	import { page } from '$app/state';
	import { rememberedReplaysListHref } from '$lib/replays';

	let listHref = $state('/replays');

	afterNavigate(() => {
		listHref = rememberedReplaysListHref();
	});
</script>

<div class="border-secondary-800 border-b px-4 py-3">
	<h1 class="font-heading mb-1 text-xl font-bold text-white">
		{page.status === 404 ? 'Replay not found' : 'Could not load replay'}
	</h1>
	<p class="text-secondary-400 text-sm">
		{page.error?.message ?? 'This community replay is not available.'}
	</p>
	<p class="mt-2">
		<a href={listHref} class={cn(interactive, 'text-primary text-sm hover:underline')}>
			Back to community replays
		</a>
	</p>
</div>
