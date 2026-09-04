<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { cn } from '$lib/utils/cn';
	import { dropdownPanel, interactive } from '$lib/utils/variants';

	type Props = {
		trigger: Snippet;
		children: Snippet<[{ close: () => void }]>;
		class?: string;
		triggerClass?: string;
		panelClass?: string;
		align?: 'start' | 'end';
		'aria-label'?: string;
	};

	let {
		trigger,
		children,
		class: className,
		triggerClass,
		panelClass,
		align = 'end',
		'aria-label': ariaLabel
	}: Props = $props();

	let open = $state(false);
	let root: HTMLDivElement | undefined;

	const attachRoot: Attachment<HTMLDivElement> = (node) => {
		root = node;
		return () => {
			if (root === node) {
				root = undefined;
			}
		};
	};

	function close() {
		open = false;
	}

	function toggle() {
		open = !open;
	}

	$effect(() => {
		if (!open) {
			return;
		}

		function onPointerDown(event: PointerEvent) {
			const target = event.target;
			if (!(target instanceof Node) || !root?.contains(target)) {
				close();
			}
		}

		function onKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				close();
			}
		}

		document.addEventListener('pointerdown', onPointerDown, true);
		document.addEventListener('keydown', onKeyDown);

		return () => {
			document.removeEventListener('pointerdown', onPointerDown, true);
			document.removeEventListener('keydown', onKeyDown);
		};
	});
</script>

<div {@attach attachRoot} class={cn('relative flex h-full items-stretch', className)}>
	<button
		type="button"
		aria-haspopup="menu"
		aria-expanded={open}
		aria-label={ariaLabel}
		class={cn(interactive, 'inline-flex h-full items-center', triggerClass)}
		onclick={toggle}
	>
		{@render trigger()}
	</button>

	{#if open}
		<div
			role="menu"
			class={cn(
				dropdownPanel,
				'absolute top-full z-50 min-w-44',
				align === 'end' ? 'end-0' : 'start-0',
				panelClass
			)}
		>
			{@render children({ close })}
		</div>
	{/if}
</div>
