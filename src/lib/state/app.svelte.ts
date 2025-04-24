import type { Modules } from '@fknoobs/app';
import type { Component } from 'svelte';
import { page } from '$app/state';
import { Twitch } from '$lib/modules/twitch/twitch.svelte';
import { Replays } from '$lib/modules/replay-manager/replays.svelte';
import { load, type Store } from '@tauri-apps/plugin-store';
import Emittery from 'emittery';
import { Game } from './coh.svelte';

/**
 * Defines the structure for a navigation route within the application.
 */
export type Route = {
	title: string;
	href: string;
	page?: {
		title: string;
		description: string;
	};
	component?: Component;
};

/**
 * Defines the structure for application settings.
 */
export type Settings = {
	isStreamer: boolean;
	pathToWarnings: string;
	//[key: string]: any;
} & Partial<{ [K in keyof Modules]: InstanceType<Modules[K]>['settings'] }>;

export type AppEvents = {
	boot: App;
};

/**
 * Manages the global state and core functionalities of the application.
 */
class App extends Emittery<AppEvents> {
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
		}
	]);

	/**
	 * Reactive derived state representing the currently active route based on the browser's URL.
	 *
	 * @public
	 * @type {Route | undefined}
	 */
	currentRoute = $derived.by(() => {
		return this.routes.find((route) => {
			if (page.url.hash !== '') {
				return page.url.hash !== '' && page.url.hash === route.href;
			}

			return route.href === page.url.pathname;
		});
	});

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
		 * Indicates if the user is a streamer.
		 * When enabled some more advanced features are available.
		 */
		isStreamer: false,
		/**
		 * Path to the Company of Heroes warnings log file.
		 */
		pathToWarnings: '/home/codeit/fknoobscoh/bun-sidecar/warnings.log'
		/**
		 * Twitch module settings.
		 * This includes the Twitch API client ID and other related settings.
		 *
		 * The default settings are defined in the Twitch module.
		 */
		//twitch: defaultTwitchSettings
	});

	/**
	 * A record mapping module names (strings) to their corresponding class constructors.
	 * This allows for dynamic instantiation or referencing of modules within the application.
	 *
	 * @public
	 * @type {Record<string, new () => Module>}
	 */
	modules: Modules = {
		twitch: Twitch,
		replays: Replays
	};

	/**
	 * Reactive array holding instances of the active modules.
	 *
	 * @public
	 * @type {Map<string, InstanceType<Modules[keyof Modules]>>} // Store module instances keyed by name
	 */
	activeModules = $state(new Map<keyof Modules, InstanceType<Modules[keyof Modules]>>());

	/**
	 * Reactive object representing the current game state.
	 * This includes information about the game session, such as whether it's launched,
	 * the player's Steam ID, and the current lobby state.
	 *
	 * @public
	 * @type {Game}
	 */
	game: Game = $state(new Game());

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

		for await (const moduleConstructor of Object.values(this.modules)) {
			const mod = new moduleConstructor() as InstanceType<Modules[keyof Modules]>;
			await mod.register();

			this.activeModules.set(mod.name as keyof Modules, mod);
			this.routes.push({
				component: mod.component,
				title: mod.menuItemName,
				href: `#${mod.name}`
			});
		}

		await this.emit('boot', this);
	}

	getModule<K extends keyof Modules>(name: K): InstanceType<Modules[K]> {
		const module = this.activeModules.get(name);

		if (!module) {
			throw new Error(`Module ${name} not found`);
		}

		return module as InstanceType<Modules[K]>;
	}
}

/**
 * Singleton instance of the App class, providing global access to application state and methods.
 */
export const app = new App();
