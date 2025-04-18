import type { Voice } from 'elevenlabs/api';
import { page } from '$app/state';
import { ElevenLabs } from '$lib/modules/elevenlabs.svelte';
import { TTS } from '$lib/modules/tts.svelte';
import { Twitch } from '$lib/modules/twitch.svelte';
import { load, type Store } from '@tauri-apps/plugin-store';
import { TTSPersonal } from '$lib/modules/tts-personal.svelte';
import type { Module } from '$lib/modules/module.svelte';

/**
 * Defines the structure for a navigation route within the application.
 */
export type Route = {
	href: string;
	title: string;
	page?: {
		title: string;
		description: string;
	};
};

/**
 * Defines the structure for application settings.
 */
export type Settings = {
	tts: {
		enabled: boolean;
		elevenlabsApiKey: string | undefined;
		channel: string | undefined;
		twitchAccessToken: string | undefined;
		provider: 'elevenlabs' | 'brian';
		voiceName: string;
		personalVoicesEnabled: boolean;
		personalVoices: string[];
	};
};

/**
 * Manages the global state and core functionalities of the application.
 */
class App {
	/**
	 * Reactive array holding the application's navigation routes.
	 *
	 * @public
	 * @type {Route[]}
	 */
	routes: Route[] = $state([
		{
			href: '/',
			title: 'Dashboard'
		},
		{
			href: '/tts-settings',
			title: 'TTS Settings'
		},
		{
			href: '/replaymanager-settings',
			title: 'Replay Manager'
		}
	]);

	/**
	 * Reactive derived state representing the currently active route based on the browser's URL.
	 *
	 * @public
	 * @type {Route | undefined}
	 */
	currentRoute = $derived(this.routes.find((route) => route.href === page.url.pathname));

	/**
	 * Instance of the Tauri store plugin for persistent data storage.
	 * Initialized in the `load` method. Undefined until initialization.
	 *
	 * @public
	 * @type {Store | undefined}
	 */
	store!: Store;

	/**
	 * Reactive object holding the application's settings.
	 * Loaded from the store or initialized with defaults.
	 *
	 * @public
	 * @type {Settings}
	 */
	settings: Settings = $state({
		/**
		 * Text-to-Speech (TTS) configuration.
		 *
		 * Determines if TTS is active (`enabled`) for messages in the specified `channel`.
		 * Uses the ElevenLabs API if `elevenlabsApikey` is provided, otherwise falls back
		 * to a default TTS engine (Brian TTS).
		 */
		tts: {
			enabled: false,
			channel: undefined,
			elevenlabsApiKey: undefined,
			twitchAccessToken: undefined,
			provider: 'brian',
			voiceName: 'Roger',
			personalVoicesEnabled: false,
			personalVoices: []
		}
	});

	/**
	 * Instance of the Twitch module for interacting with Twitch services.
	 * Initialized in the `load` method. Undefined until initialization.
	 *
	 * @public
	 * @type {Twitch | undefined}
	 */
	twitch!: Twitch;

	/**
	 * Instance of the TTS module for handling text-to-speech functionality.
	 * Initialized in the `load` method. Undefined until initialization.
	 *
	 * @public
	 * @type {TTS | undefined}
	 */
	tts!: TTS;

	/**
	 * Instance of the ElevenLabs module for handling ElevenLabs TTS functionality.
	 *
	 * @public
	 * @type {ElevenLabs}
	 */
	elevenlabs!: ElevenLabs;

	/**
	 * Instance of the TTSPersonal module for handling personal TTS functionality.
	 *
	 * @public
	 * @type {TTSPersonal | undefined}
	 */
	ttsPersonal!: TTSPersonal;

	/**
	 * A record mapping module names (strings) to their corresponding class constructors.
	 * This allows for dynamic instantiation or referencing of modules within the application.
	 *
	 * @public
	 * @type {Record<string, typeof Module>}
	 */
	modules: Record<string, typeof Module> = {
		tts: TTS,
		elevenlabs: ElevenLabs,
		twitch: Twitch
	};

	/**
	 * Asynchronously initializes the application state.
	 * Loads the persistent store, retrieves settings, and initializes modules (TTS, Twitch).
	 * Sets up a listener for changes in the store to keep the `settings` state updated.
	 *
	 * @public
	 * @async
	 * @returns {Promise<void>} A promise that resolves when initialization is complete.
	 */
	async boot() {
		this.store = await load('app.json');
		this.settings = (await this.store.get('settings')) ?? this.settings;
		this.twitch = new Twitch();
		this.tts = new TTS();
		this.elevenlabs = new ElevenLabs();
		this.ttsPersonal = new TTSPersonal();

		this.store.onChange(async (key) => {
			if (key === 'settings') {
				this.settings = (await this.store.get('settings')) ?? this.settings;
			}
		});
	}
}

/**
 * Singleton instance of the App class, providing global access to application state and methods.
 */
export const app = new App();
