<script lang="ts">
	import { Toaster as SonnerToaster } from 'svelte-sonner';
	import { toastBase, toastVariant } from '../variants';
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';
	import WarningIcon from 'phosphor-svelte/lib/WarningIcon';
	import InfoIcon from 'phosphor-svelte/lib/InfoIcon';
	import XIcon from 'phosphor-svelte/lib/XIcon';
</script>

<SonnerToaster
	theme="dark"
	position="bottom-right"
	toastOptions={{
		unstyled: true,
		classes: {
			toast: toastBase,
			title: 'text-sm font-semibold',
			description: 'text-sm opacity-80',
			icon: 'shrink-0',
			content: 'min-w-0 flex-1',
			actionButton:
				'border-primary/30 bg-primary/15 text-primary ml-auto cursor-pointer rounded border px-2 py-1 text-xs font-medium',
			cancelButton:
				'border-secondary-700 bg-secondary-800/80 text-secondary-300 ml-auto cursor-pointer rounded border px-2 py-1 text-xs font-medium',
			closeButton:
				'border-current/20 bg-black/20 text-current/70 hover:text-current absolute top-1.5 right-1.5 cursor-pointer rounded border p-0.5',
			normal: toastVariant('default'),
			default: toastVariant('default'),
			loading: toastVariant('default'),
			success: toastVariant('success'),
			error: toastVariant('error'),
			info: toastVariant('info'),
			warning: toastVariant('warning')
		}
	}}
>
	{#snippet successIcon()}
		<CheckIcon size={18} weight="bold" class="rounded-md bg-success/30 p-1 text-green-200" />
	{/snippet}
	{#snippet errorIcon()}
		<XIcon size={18} weight="bold" class="rounded-md bg-destructive/30 p-1 text-red-200" />
	{/snippet}
	{#snippet infoIcon()}
		<InfoIcon size={18} weight="bold" class="rounded-md bg-info/30 p-1 text-sky-200" />
	{/snippet}
	{#snippet warningIcon()}
		<WarningIcon size={18} weight="bold" class="rounded-md bg-warning/30 p-1 text-amber-200" />
	{/snippet}
</SonnerToaster>
