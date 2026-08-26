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
	<Form.Group>
		<Form.Label for="voice-alias">{t('Alias')}</Form.Label>
		<Input id="voice-alias" bind:value={alias} placeholder={label} />
	</Form.Group>
	<div class="flex justify-end gap-2">
		<Button type="button" variant="secondary" onclick={() => dialog.close()}>{t('Cancel')}</Button>
		<Button type="submit" variant="primary">{t('Save')}</Button>
	</div>
</Form.Root>
