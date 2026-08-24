<script lang="ts">
	import CopyIcon from 'phosphor-svelte/lib/CopyIcon';
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';
	import FolderOpenIcon from 'phosphor-svelte/lib/FolderOpenIcon';
	import CloudArrowUpIcon from 'phosphor-svelte/lib/CloudArrowUpIcon';
	import { openPath } from '@tauri-apps/plugin-opener';
	import { twitchOverlays } from '$features/twitch-overlays';
	import { cn } from '$lib/utils';
	import { watch } from 'runed';
	import { app } from '$core/app/context';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Form from '$lib/components/ui/form';

	const overlay = twitchOverlays.overlays[0];
	let copied = $state(false);
	let publishing = $state(false);
	let hasUnpublishedChanges = $state(false);
	let checkingChanges = $state(false);
	let hasDistBuild = $state(false);
	let distStale = $state(false);

	const overlayUrl = $derived(
		app.features.auth.user?.id ? overlay.getHostedUrl(app.features.auth.user.id) : ''
	);

	const canPublish = $derived(
		hasDistBuild &&
			hasUnpublishedChanges &&
			!distStale &&
			!publishing &&
			!checkingChanges &&
			!!app.features.auth.user
	);

	async function refreshChangeState() {
		if (!app.features.auth.user) {
			hasUnpublishedChanges = false;
			hasDistBuild = false;
			distStale = false;
			return;
		}

		checkingChanges = true;
		try {
			[hasUnpublishedChanges, hasDistBuild, distStale] = await Promise.all([
				overlay.hasUnpublishedChanges(),
				overlay.hasDistBuild(),
				overlay.isDistStale()
			]);
		} catch (error) {
			console.warn('[OVERLAYS-TAB]: failed to check overlay changes:', error);
			hasUnpublishedChanges = false;
			hasDistBuild = false;
			distStale = false;
		} finally {
			checkingChanges = false;
		}
	}

	watch(
		() => app.features.auth.user?.id,
		(userId) => {
			if (!userId) {
				hasUnpublishedChanges = false;
				hasDistBuild = false;
				distStale = false;
				return;
			}

			void refreshChangeState();
		}
	);

	$effect(() => {
		if (!app.features.auth.user) return;

		const onFocus = () => {
			void refreshChangeState();
		};

		window.addEventListener('focus', onFocus);
		return () => window.removeEventListener('focus', onFocus);
	});

	function copyToClipboard() {
		if (!overlayUrl) return;
		navigator.clipboard.writeText(overlayUrl);
		copied = true;
		app.toast.success('Overlay URL copied to clipboard!');
		setTimeout(() => {
			copied = false;
		}, 5000);
	}

	async function openInEditor() {
		try {
			await openPath(await overlay.getPath());
		} catch (error) {
			console.error('Failed to open overlay folder:', error);
			app.toast.error('Could not open overlay folder in your editor.');
		}
	}

	async function publishChanges() {
		if (publishing || !canPublish) return;
		publishing = true;
		try {
			await overlay.publish();
			await refreshChangeState();
			app.toast.success('Overlay changes published to server.');
		} catch (error) {
			console.error('Failed to publish overlay:', error);
			const message =
				error instanceof Error ? error.message : 'Failed to publish overlay changes.';
			app.toast.error(message);
		} finally {
			publishing = false;
		}
	}
</script>

<Form.Root class="space-y-0">
	<div class="border-secondary-800 border-b p-4">
		<Form.Group class="mb-0">
			<Form.Label for="overlay-url">Overlay URL</Form.Label>
			<Form.Description>
				Use this URL in your streaming software to add the Opponent Bot overlay to your stream.
			</Form.Description>
			<div class="relative flex">
				<Input
					id="overlay-url"
					readonly
					value={overlayUrl}
					placeholder="Log in to generate your overlay URL"
					class={cn(copied && 'border-success bg-success/5')}
				/>
				<Button
					variant="ghost"
					size="icon-sm"
					type="button"
					class={cn(
						'text-secondary-400 absolute top-1.5 right-1.5',
						copied && 'text-success pointer-events-none'
					)}
					onclick={copyToClipboard}
					disabled={!overlayUrl}
					title="Copy Overlay URL"
				>
					{#if copied}
						<CheckIcon size={20} />
					{:else}
						<CopyIcon size={20} />
					{/if}
				</Button>
			</div>
		</Form.Group>
	</div>
</Form.Root>

<div class="border-secondary-800 flex flex-wrap gap-2 border-b p-4">
	<Button type="button" variant="secondary" onclick={openInEditor}>
		<FolderOpenIcon size={18} />
		Open in editor
	</Button>
	<Button type="button" onclick={publishChanges} disabled={!canPublish}>
		<CloudArrowUpIcon size={18} />
		{publishing ? 'Publishing…' : 'Publish changes to server'}
	</Button>
</div>

<div class="text-secondary-400 max-w-2xl space-y-2 p-4 text-sm">
	<p>
		Your overlay is hosted at the URL above. To customize it, open the overlay folder, edit files in
		<code class="text-secondary-300">src/</code>, then build and publish:
	</p>
	<ol class="list-decimal space-y-1 pl-5">
		<li>
			Run <code class="text-secondary-300">npm install</code> once (requires
			<a
				class="text-secondary-300 underline"
				href="https://nodejs.org/"
				target="_blank"
				rel="noreferrer">Node.js</a
			>)
		</li>
		<li>
			Preview with test lobbies: <code class="text-secondary-300">npm run dev</code>, then open
			<code class="text-secondary-300">http://localhost:5173</code> (1v1–4v4 buttons appear
			bottom-right)
		</li>
		<li>Edit Svelte/CSS in <code class="text-secondary-300">src/</code></li>
		<li>
			Run <code class="text-secondary-300">npm run build</code> in the overlay folder (via “Open in editor”)
			to update <code class="text-secondary-300">dist/</code>
		</li>
		<li>Click “Publish changes to server” to update the live overlay</li>
	</ol>
	{#if !hasDistBuild && app.features.auth.user}
		<p class="text-warning">No build found. Run npm run build in the overlay folder before publishing.</p>
	{:else if distStale}
		<p class="text-warning">
			Source files are newer than dist/. Run npm run build before publishing.
		</p>
	{/if}
</div>
