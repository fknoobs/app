<script lang="ts">
	import { SetCrumbs } from '$lib/components/ui/breadcrumb';
	import { useReplay } from '.';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();
	let replay = $derived(useReplay());
</script>

<SetCrumbs items={[{ label: replay.replayName || t('Replay') }]} />
