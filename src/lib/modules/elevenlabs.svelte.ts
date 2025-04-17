import { app } from '$lib/state/app.svelte';
import { ElevenLabsClient } from 'elevenlabs';
import { Module } from './modele.svelte';

export class ElevenLabs extends Module {
	/**
	 * Indicates whether ElevenLabs TTS is enabled.
	 * Derived from application settings.
	 *
	 * @readonly
	 * @type {boolean}
	 */
	enabled = $derived(
		!!app.settings.tts.elevenlabsApiKey && app.settings.tts.elevenlabsApiKey !== ''
	);

	/**
	 * The API key for ElevenLabs TTS service.
	 * Derived from application settings.
	 *
	 * @readonly
	 * @type {string | undefined}
	 */
	apiKey = $derived(app.settings.tts.elevenlabsApiKey);

	/**
	 * The ElevenLabs API client instance.
	 * Undefined until initialized.
	 *
	 * @public
	 * @type {ElevenLabsClient | undefined}
	 */
	client: ElevenLabsClient | undefined = undefined;

	async init() {
		if (!this.apiKey) {
			throw new Error('API key is required for ElevenLabs TTS.');
		}

		this.client = new ElevenLabsClient({ apiKey: this.apiKey });
	}

	destroy() {}
}
