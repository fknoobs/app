<script lang="ts">
	import { Input, Selection, Checkbox } from '$lib/components/ui/input';
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

<div
	class="border-secondary-800 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b p-4"
>
	<div class="flex flex-col flex-wrap gap-4">
		<div class="flex h-11 flex-wrap items-center gap-4">
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
		<div class="flex gap-4">
			<div class="flex w-fit min-w-48 flex-col gap-1.5">
				<span class="text-secondary-400 text-xs font-medium">{t('Title')}</span>
				<Input placeholder={t('Enter title')} bind:value={list.filters.query} />
			</div>
			<div class="flex w-fit flex-col gap-1.5">
				<span class="text-secondary-400 text-xs font-medium">{t('Players')}</span>
				<Selection
					options={playersList}
					placeholder={t('Select players')}
					multiple
					bind:value={list.filters.players}
				/>
			</div>
			<div class="flex w-fit flex-col gap-1.5">
				<span class="text-secondary-400 text-xs font-medium">{t('Maps')}</span>
				<Selection
					options={mapsList}
					placeholder={t('Select maps')}
					multiple
					bind:value={list.filters.maps}
				/>
			</div>
		</div>
	</div>
</div>
