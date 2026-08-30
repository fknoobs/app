<script lang="ts">
	import { Input, Selection, Checkbox } from '$lib/components/ui/input';
	import * as Form from '$lib/components/ui/form';
	import type { ReplayList } from './replay-list.svelte';
	import { useI18n } from '$lib/i18n';

	interface Props {
		list: ReplayList;
		mapsList: { value: string; label: string }[];
		playersList: { value: string; label: string }[];
	}

	let { list = $bindable(), mapsList, playersList }: Props = $props();
	const { t } = useI18n();
</script>

<Form.Group label={t('Filters')} layout="stacked">
	<div class="flex flex-wrap items-center gap-3">
		<Checkbox
			label={t('Ranked only')}
			bind:checked={list.filters.ranked.value}
			bind:indeterminate={list.filters.ranked.indeterminate}
		/>
		<Checkbox
			label={t('Victory Points')}
			bind:checked={list.filters.vp.value}
			bind:indeterminate={list.filters.vp.indeterminate}
		/>
		<Checkbox
			label={t('High Resources')}
			bind:checked={list.filters.highResources.value}
			bind:indeterminate={list.filters.highResources.indeterminate}
		/>
	</div>
	<div class="flex min-w-0 flex-wrap items-center gap-3">
		<Input placeholder={t('Enter title')} bind:value={list.filters.query} aria-label={t('Title')} />
		<Selection
			options={playersList}
			placeholder={t('Select players')}
			multiple
			bind:value={list.filters.players}
		/>
		<Selection
			options={mapsList}
			placeholder={t('Select maps')}
			multiple
			bind:value={list.filters.maps}
		/>
	</div>
</Form.Group>
