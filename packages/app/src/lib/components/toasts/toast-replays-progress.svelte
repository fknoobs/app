<script lang="ts">
	import { app } from '$core/app/context';
	import SpinnerIcon from 'phosphor-svelte/lib/SpinnerIcon';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();
</script>

<div
	class="text-secondary-300 flex items-center gap-2 rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm shadow-xl"
>
	<SpinnerIcon class="text-secondary-400 animate-spin" size={20} />
	<span>
		{t('analyzing replays:')}
		<small class="text-xs">{app.features['replay-analyzer'].progress.processed}</small>
		/
		<small class="text-xs">{app.features['replay-analyzer'].progress.total}</small>
	</span>
</div>
