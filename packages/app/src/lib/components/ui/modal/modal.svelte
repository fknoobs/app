<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { cn } from '$lib/utils';
	import { overlayBackdrop, surfaceModal } from '../variants';
	import { modal } from './modal.svelte.js';
	import { H } from '../h';
	import CloseIcon from 'phosphor-svelte/lib/XIcon';
</script>

<Dialog.Root bind:open={modal.isOpen}>
	<Dialog.Portal>
		<Dialog.Overlay
			class={cn(
				overlayBackdrop,
				'fixed inset-0 z-50',
				'data-[state=open]:animate-in data-[state=open]:fade-in-0',
				'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
				'flex items-center justify-center overflow-y-auto p-4'
			)}
		/>
		<Dialog.Content
			class={cn(
				'data-[state=open]:animate-in data-[state=open]:zoom-in absolute duration-75',
				'data-[state=closed]:animate-out data-[state=closed]:zoom-out data-[state=closed]:fade-out',
				'top-0 left-1/2 z-50 mx-auto -translate-x-1/2 rounded-xl outline-hidden',
				surfaceModal,
				modal.size === 'sm' && 'mt-12 max-h-[calc(100vh-4rem)] w-[320px]',
				modal.size === 'md' && 'mt-12 max-h-[calc(100vh-4rem)] w-[480px]',
				modal.size === 'lg' && 'mt-12 max-h-[calc(100vh-4rem)] w-[640px]',
				modal.size === 'xl' && 'mt-12 max-h-[calc(100vh-4rem)] w-[800px]',
				modal.size === 'full' && 'mt-4 max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)]'
			)}
			{...modal.contentProps}
		>
			{#if modal.title}
				<Dialog.Title class="sticky top-0 z-10 p-6">
					<div class="flex items-start justify-between gap-4">
						<div>
							{#if typeof modal.title === 'function'}
								{@render modal.title()}
							{:else}
								<H level="4">{modal.title}</H>
							{/if}
							{#if modal.description}
								<Dialog.Description class="text-secondary-400 mt-1">
									{#if typeof modal.description === 'function'}
										{@render modal.description()}
									{:else}
										{@html modal.description}
									{/if}
								</Dialog.Description>
							{/if}
						</div>
						{#if false === modal.hideCloseButton}
							<Dialog.Close
								class="bg-secondary-800 hover:bg-secondary-700 cursor-pointer rounded-md p-1.5 transition outline-none"
							>
								<CloseIcon size={24} />
							</Dialog.Close>
						{/if}
					</div>
				</Dialog.Title>
			{/if}
			<div
				class={cn(
					'overflow-y-auto px-6 pb-6',
					modal.size === 'full' ? 'max-h-[calc(100vh-7rem)]' : 'max-h-[calc(100vh-12rem)]'
				)}
			>
				<svelte:component this={modal.component} {...modal.props} />
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
