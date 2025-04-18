import { app } from '$lib/state/app.svelte';
import { StaticAuthProvider, TokenInfo } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { ChatClient, buildEmoteImageUrl } from '@twurple/chat';
import { PubSubClient } from '@twurple/pubsub';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import { Module } from './module.svelte';

/**
 * Represents the Twitch integration module.
 * Handles authentication and interaction with the Twitch API.
 */
export class Twitch extends Module {
	/**
	 * Indicates whether the Twitch module is enabled.
	 * This is derived from the application settings.
	 *
	 * @readonly
	 * @type {boolean}
	 */
	enabled = $derived(!!app.settings.tts.twitchAccessToken);

	/**
	 * The client ID for the Twitch application.
	 *
	 * @readonly
	 * @type {string}
	 */
	readonly clientId = 'kp4erttmb696osn4inqrlg6qmv5eaq';

	/**
	 * The Twitch access token derived from application settings.
	 * This is reactive and will update when the settings change.
	 *
	 * @readonly
	 * @type {string | undefined}
	 */
	readonly accessToken = $derived(app.settings.tts.twitchAccessToken);

	/**
	 * The Twurple API client instance.
	 * Undefined until initialized.
	 *
	 * @public
	 * @type {ApiClient | undefined}
	 */
	public client: ApiClient | undefined = $state(undefined);

	/**
	 * Indicates whether the Twitch client is connected.
	 *
	 * @public
	 * @type {boolean}
	 */
	public isConnected = $derived(!!this.client);

	/**
	 * The user information retrieved from the Twitch API.
	 *
	 * @public
	 * @type {TokenInfo | undefined}
	 */
	public user: TokenInfo | undefined = $state(undefined);

	/**
	 * The Twurple ChatClient instance.
	 *
	 * @public
	 * @type {ChatClient | undefined}
	 */
	public chatClient: ChatClient | undefined = $state(undefined);

	/**
	 * The EventSub WebSocket listener instance.
	 *
	 * @public
	 * @type {EventSubWsListener | undefined}
	 */
	public events: EventSubWsListener | undefined = $state(undefined);

	/**
	 * Initializes the Twurple ApiClient with the provided credentials.
	 * Logs an error if the access token is missing.
	 */
	async init() {
		if (!this.accessToken) {
			console.error('Twitch access token is not set.');
			return;
		}

		const authProvider = new StaticAuthProvider(this.clientId, this.accessToken);

		this.client = new ApiClient({ authProvider });
		this.user = (await this.client.getTokenInfo()) ?? undefined;

		this.chatClient = new ChatClient({
			authProvider,
			channels: [this.user.userName!] // ['summit1g']
		});
		this.events = new EventSubWsListener({ apiClient: this.client });

		this.events.start();
		this.chatClient.connect();
	}

	private async disconnect() {
		if (this.chatClient) {
			await this.chatClient.quit();

			this.client = undefined;
			this.chatClient = undefined;
			this.user = undefined;
			this.isConnected = false;
		}
	}

	destroy(): void {}
}
