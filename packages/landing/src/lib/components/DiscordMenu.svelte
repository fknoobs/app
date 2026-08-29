<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { cn } from '$lib/cn';
	import { COH_GLOBAL_DISCORD_URL, DISCORD_URL } from '$lib/urls';
	import { interactive } from '$lib/variants';
	import DiscordLogoIcon from 'phosphor-svelte/lib/DiscordLogoIcon';
	import XIcon from 'phosphor-svelte/lib/XIcon';

	type Props = {
		class?: string;
		children: Snippet;
	};

	let { class: className, children }: Props = $props();

	let dialog: HTMLDialogElement | undefined;

	const attachDialog: Attachment<HTMLDialogElement> = (node) => {
		dialog = node;
		return () => {
			if (dialog === node) dialog = undefined;
		};
	};

	const servers = [
		{
			href: DISCORD_URL,
			name: 'Fknoobs CoH',
			hint: 'Companion Discord'
		},
		{
			href: COH_GLOBAL_DISCORD_URL,
			name: 'Company of Heroes Global Community',
			hint: 'The wider CoH community'
		}
	];

	function open() {
		dialog?.showModal();
	}

	function close() {
		dialog?.close();
	}

	function onBackdropClick(event: MouseEvent) {
		if (event.target === dialog) close();
	}
</script>

<button
	type="button"
	class={cn(interactive, className)}
	aria-haspopup="dialog"
	onclick={open}
>
	{@render children()}
</button>

<dialog
	{@attach attachDialog}
	onclick={onBackdropClick}
	class="bg-gray-950 m-auto w-[min(28rem,calc(100%-2rem))] border-secondary-800 border p-0 text-white backdrop:bg-black/70"
>
	<div class="border-secondary-800 flex items-center justify-between border-b px-4 py-3">
		<h2 class="font-heading text-xl font-bold">Join Discord</h2>
		<button
			type="button"
			class={cn(interactive, 'text-secondary-400 hover:text-white p-1')}
			aria-label="Close"
			onclick={close}
		>
			<XIcon size={16} weight="bold" />
		</button>
	</div>
	<div>
		{#each servers as server (server.href)}
			<a
				href={server.href}
				target="_blank"
				rel="noopener noreferrer"
				class={cn(
					interactive,
					'border-secondary-800 hover:bg-secondary-950/50 flex items-start gap-3 border-b px-4 py-3 last:border-b-0'
				)}
				onclick={close}
			>
				<DiscordLogoIcon class="text-primary mt-0.5 size-5 shrink-0" weight="duotone" />
				<span class="min-w-0">
					<span class="block font-medium text-white">{server.name}</span>
					<span class="text-secondary-400 text-sm">{server.hint}</span>
				</span>
			</a>
		{/each}
	</div>
</dialog>
