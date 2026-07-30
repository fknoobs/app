import { isLiveLobbyFresh, type LiveLobby } from '$core/app/database/lobbies-live';
import type { UnsubscribeFunc } from 'pocketbase';
import { app } from '$core/app/context';
import { orderBy, uniqBy } from 'lodash-es';

const POLL_MS = 15_000;

/**
 * Reactive live lobby feed with PocketBase realtime subscription.
 * Multiple players may each have a lobbies_live row for the same session;
 * the dashboard shows unique lobbies by sessionId.
 */
export class LiveLobbiesFeed {
	items = $state<LiveLobby[]>([]);
	isLoading = $state(false);

	#unsubscribe: UnsubscribeFunc | null = null;
	#pollInterval: ReturnType<typeof setInterval> | null = null;
	#started = false;

	get totalItems() {
		return this.items.length;
	}

	async start(): Promise<void> {
		if (this.#started) return;

		this.#started = true;

		try {
			await this.refresh();
		} catch (error) {
			console.warn('[LIVE_LOBBIES]: initial refresh failed:', error);
		}

		this.#startPolling();
		await this.#subscribe();
	}

	async stop(): Promise<void> {
		if (!this.#started) return;

		this.#started = false;
		this.#clearPolling();
		await this.#unsubscribe?.();
		this.#unsubscribe = null;
		this.items = [];
	}

	async refresh(): Promise<void> {
		this.isLoading = true;

		try {
			await this.#loadItems();
		} finally {
			this.isLoading = false;
		}
	}

	async #subscribe(): Promise<void> {
		try {
			await this.#unsubscribe?.();

			this.#unsubscribe = await app.database.lobbiesLive.subscribe(async (event) => {
				if (event.action === 'delete') {
					const wasVisible = this.items.some((lobby) => lobby.id === event.record.id);
					this.items = this.items.filter((lobby) => lobby.id !== event.record.id);

					// Another player in the same session may still have a live row.
					if (wasVisible) {
						await this.#loadItems();
					}
					return;
				}

				try {
					const lobby = event.record;
					if (lobby?.id && lobby.sessionId && isLiveLobbyFresh(lobby)) {
						this.#upsert(lobby);
					} else if (lobby?.id) {
						this.items = this.items.filter((entry) => entry.id !== lobby.id);
					} else {
						await this.#loadItems();
					}
				} catch (error) {
					console.warn('[LIVE_LOBBIES]: failed to apply realtime event:', error);
					await this.#loadItems();
				}
			});
		} catch (error) {
			console.warn('[LIVE_LOBBIES]: subscribe failed:', error);
			this.#unsubscribe = null;
		}
	}

	#startPolling() {
		this.#clearPolling();
		this.#pollInterval = setInterval(() => {
			void this.#loadItems().catch((error) => {
				console.warn('[LIVE_LOBBIES]: poll refresh failed:', error);
			});
		}, POLL_MS);
	}

	#clearPolling() {
		if (this.#pollInterval) {
			clearInterval(this.#pollInterval);
			this.#pollInterval = null;
		}
	}

	async #loadItems(): Promise<void> {
		const result = await app.database.lobbiesLive.getList(1, 48);
		this.items = uniqBy(result.items.filter(isLiveLobbyFresh), 'sessionId');
	}

	#upsert(lobby: LiveLobby) {
		const withoutSameSession = this.items.filter(
			(entry) => entry.id !== lobby.id && entry.sessionId !== lobby.sessionId
		);
		this.items = orderBy([lobby, ...withoutSameSession], ['updatedAt'], ['desc']);
	}
}
