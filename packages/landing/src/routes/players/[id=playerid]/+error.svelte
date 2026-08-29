<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="border-secondary-800 border-b px-4 py-3">
	<h1 class="font-heading mb-1 text-xl font-bold text-white">
		{page.status === 404 ? 'Player not found' : 'Could not load player'}
	</h1>
	<p class="text-secondary-400 text-sm">
		{page.error?.message ?? 'Please try another Steam ID or Relic profile id.'}
	</p>
</div>
