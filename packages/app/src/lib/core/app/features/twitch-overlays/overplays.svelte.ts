import { watch } from 'runed';
import { pocketbase } from '$core/pocketbase';
import { app } from '$core/app/context';
import { Feature } from '../feature.svelte';
import type { Overlay } from './overlays/overlay.svelte.ts';
import OverlayOverwriteConfirm from './overlay-overwrite-confirm.svelte';

/**
 * Registry for the Opponent Bot overlay. Installs local source for editing and
 * publishes to the hosted overlay route on api.coh1stats.com.
 */
export class TwitchOverlays extends Feature {
	name = 'twitch-overlays';

	overlays: Overlay[] = $state([]);

	#disposeWatchers: (() => void) | null = null;
	#ensurePublishedInFlight = false;
	#promptInFlight = false;
	#skippedPendingUpdates = new Set<string>();

	registerOverlay(overlay: Overlay) {
		if (this.overlays.find((o) => o.name === overlay.name)) {
			return;
		}

		this.overlays.push(overlay);
	}

	#pendingUpdateKey(overlay: Overlay) {
		return `${overlay.name}:${overlay.version ?? 'unknown'}`;
	}

	#confirmOverwrite(): Promise<boolean> {
		return new Promise((resolve) => {
			let settled = false;

			const settle = (value: boolean) => {
				if (settled) return;
				settled = true;
				unsubscribe();
				resolve(value);
				app.modal.close();
			};

			const unsubscribe = app.modal.on('close', () => {
				if (settled) return;
				settled = true;
				unsubscribe();
				resolve(false);
			});

			app.modal.create({
				component: OverlayOverwriteConfirm,
				title: 'Overwrite overlay?',
				description:
					'A new overlay version is available. Your current customized overlay will be backed up first.',
				size: 'md',
				props: {
					onConfirm: () => settle(true),
					onCancel: () => settle(false)
				}
			});
			app.modal.open();
		});
	}

	async #promptPendingUpdates(overlays: Overlay[]) {
		if (this.#promptInFlight) return;

		this.#promptInFlight = true;
		try {
			for (const overlay of overlays) {
				const key = this.#pendingUpdateKey(overlay);
				if (this.#skippedPendingUpdates.has(key)) continue;
				if (!(await overlay.hasPendingUpdate())) continue;

				const ok = await this.#confirmOverwrite();
				// Never re-prompt for this version in the same session (yes or no).
				this.#skippedPendingUpdates.add(key);

				if (!ok) continue;

				try {
					await overlay.overwriteWithLatest({ backup: true });
					app.toast.success('Overlay updated. Your previous version was backed up.');
				} catch (error) {
					console.error('[TWITCH-OVERLAYS]: overwrite failed:', error);
					const message =
						error instanceof Error
							? error.message
							: 'Failed to overwrite overlay. Check the logs.';
					app.toast.error(message);
				}
			}
		} finally {
			this.#promptInFlight = false;
		}
	}

	async enable() {
		this.#disposeWatchers = $effect.root(() => {
			watch(
				() => [this.overlays, pocketbase.authStore.isValid] as const,
				([overlays, isAuthenticated]) => {
					void (async () => {
						for (const overlay of overlays) {
							await overlay.register();
						}

						await this.#promptPendingUpdates(overlays);

						if (!isAuthenticated || overlays.length === 0 || this.#ensurePublishedInFlight) {
							return;
						}

						this.#ensurePublishedInFlight = true;
						try {
							for (const overlay of overlays) {
								await overlay.ensurePublished();
							}
						} catch (error) {
							console.warn('[TWITCH-OVERLAYS]: ensurePublished failed:', error);
						} finally {
							this.#ensurePublishedInFlight = false;
						}
					})();
				}
			);
		});
	}

	async disable() {
		this.#disposeWatchers?.();
		this.#disposeWatchers = null;
	}

	defaultSettings() {
		return { enabled: true };
	}
}

export const twitchOverlays = new TwitchOverlays();
