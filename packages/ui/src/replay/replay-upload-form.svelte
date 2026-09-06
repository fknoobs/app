<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button } from '@company-of-heroes/ui/button';
	import { Input, Textarea } from '@company-of-heroes/ui/input';
	import { interactive } from '@company-of-heroes/ui/variants';
	import { cn } from '@company-of-heroes/ui/cn';
	import ReplayFileDropzone from './replay-file-dropzone.svelte';

	export type ReplayUploadPreview = {
		mapName: string;
		durationLabel: string;
		playerCount: number;
		isRanked: boolean;
	};

	type Props = {
		title: string;
		description: string;
		fileName: string | null;
		preview: ReplayUploadPreview | null;
		busy?: boolean;
		error?: string | null;
		disabled?: boolean;
		onTitleChange: (value: string) => void;
		onDescriptionChange: (value: string) => void;
		onFileChange: (file: File | null) => void;
		onSubmit: () => void;
		onCancel?: () => void;
		afterDescription?: Snippet;
		titleLabel?: string;
		descriptionLabel?: string;
		fileLabel?: string;
		dropLabel?: string;
		browseLabel?: string;
		changeFileLabel?: string;
		submitLabel?: string;
		cancelLabel?: string;
		mapLabel?: string;
		durationLabel?: string;
		playersLabel?: string;
		rankedLabel?: string;
		hint?: string;
		class?: string;
	};

	let {
		title = $bindable(''),
		description = $bindable(''),
		fileName,
		preview,
		busy = false,
		error = null,
		disabled = false,
		onTitleChange,
		onDescriptionChange,
		onFileChange,
		onSubmit,
		onCancel,
		afterDescription,
		titleLabel = 'Title',
		descriptionLabel = 'Description',
		fileLabel = 'Replay file',
		dropLabel = 'Drop a .rec file here',
		browseLabel = 'or click to browse',
		changeFileLabel = 'Change file',
		submitLabel = 'Upload',
		cancelLabel = 'Cancel',
		mapLabel = 'Map',
		durationLabel = 'Duration',
		playersLabel = 'Players',
		rankedLabel = 'Ranked',
		hint = 'Upload a Company of Heroes .rec file to share it in Member replays.',
		class: className
	}: Props = $props();
</script>

<div class={cn('flex flex-col gap-4 p-4', className)}>
	<p class="text-secondary-400 text-sm">{hint}</p>

	<ReplayFileDropzone
		id="member-replay-file"
		{fileName}
		{busy}
		{disabled}
		label={fileLabel}
		{dropLabel}
		{browseLabel}
		{changeFileLabel}
		{onFileChange}
	/>

	{#if preview}
		<div
			class="border-secondary-800 bg-secondary-900/40 grid gap-2 rounded-md border px-3 py-2 text-sm text-white sm:grid-cols-2"
		>
			<div>
				<span class="text-secondary-400">{mapLabel}:</span>
				{preview.mapName}
			</div>
			<div>
				<span class="text-secondary-400">{durationLabel}:</span>
				{preview.durationLabel}
			</div>
			<div>
				<span class="text-secondary-400">{playersLabel}:</span>
				{preview.playerCount}
			</div>
			{#if preview.isRanked}
				<div class="text-primary-100">{rankedLabel}</div>
			{/if}
		</div>
	{/if}

	<div class="flex flex-col gap-2">
		<label class="text-secondary-300 text-sm font-medium" for="member-replay-title">{titleLabel}</label>
		<Input
			id="member-replay-title"
			value={title}
			oninput={(event) => onTitleChange((event.currentTarget as HTMLInputElement).value)}
			disabled={busy || disabled}
		/>
	</div>

	<div class="flex flex-col gap-2">
		<label class="text-secondary-300 text-sm font-medium" for="member-replay-description"
			>{descriptionLabel}</label
		>
		<Textarea
			id="member-replay-description"
			rows={3}
			value={description}
			oninput={(event) => onDescriptionChange((event.currentTarget as HTMLTextAreaElement).value)}
			disabled={busy || disabled}
		/>
	</div>

	{#if afterDescription}
		{@render afterDescription()}
	{/if}

	{#if error}
		<p class="text-sm text-red-400" role="alert">{error}</p>
	{/if}

	<div class="flex flex-wrap items-center justify-end gap-2">
		{#if onCancel}
			<button
				type="button"
				class={cn(interactive, 'text-secondary-400 px-3 py-2 text-sm')}
				onclick={onCancel}
				disabled={busy}
			>
				{cancelLabel}
			</button>
		{/if}
		<Button type="button" disabled={busy || disabled || !fileName} onclick={onSubmit}>
			{busy ? `${submitLabel}…` : submitLabel}
		</Button>
	</div>
</div>
