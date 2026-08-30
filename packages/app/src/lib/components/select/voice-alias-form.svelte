<script lang="ts" module>
	export type VoiceAliasFormProps = {
		alias?: string;
		label: string;
		onSave: (alias: string) => void;
	};
</script>

<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { dialog } from '$lib/components/ui/dialog';
	import { useI18n } from '$lib/i18n';

	let { alias = $bindable(''), label, onSave }: VoiceAliasFormProps = $props();
	const { t } = useI18n();
</script>

<Form.Root
	onsubmit={(event) => {
		event.preventDefault();
		onSave(alias);
	}}
>
	<Form.Group inputId="voice-alias" label={t('Alias')}>
		<Input id="voice-alias" bind:value={alias} placeholder={label} />
	</Form.Group>
	<Form.Group>
		<Button type="button" variant="secondary" class="w-fit" onclick={() => dialog.close()}>
			{t('Cancel')}
		</Button>
		<Button type="submit" class="w-fit">{t('Save')}</Button>
	</Form.Group>
</Form.Root>
