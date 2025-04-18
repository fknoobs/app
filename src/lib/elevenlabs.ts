import { isArray } from 'lodash-es';
import { app } from './state/app.svelte';
import { fetch } from '@tauri-apps/plugin-http';

export async function init() {
	if (!app.elevenlabs.client) {
		return;
	}

	const voices = {
		Adolf:
			'https://nbg1.your-objectstorage.com/mediabirds-public/tts-audio/adolf/voice_of_adolf_new.mp3',
		Simply:
			'https://nbg1.your-objectstorage.com/mediabirds-public/tts-audio/simply/voice_of_simply.mp3',
		Sopa: Array.from(Array(14).keys()).map(
			(i) =>
				`https://nbg1.your-objectstorage.com/mediabirds-public/tts-audio/sopa/voice_of_sopa - isolated_out_${i + 1}.wav`
		),
		Ika: 'https://nbg1.your-objectstorage.com/mediabirds-public/tts-audio/d3exn/voice_of_d3exn.m4a',
		Xcom: 'https://nbg1.your-objectstorage.com/mediabirds-public/tts-audio/xcom/voice_of_xcom.mp3'
	};

	const data = await app.elevenlabs.client.voices.getAll();

	for await (const voice of Object.entries(voices)) {
		const [name, url] = voice;
		const elevenLabsVoiceExists = data.voices.find((voice) => voice.name === name);

		if (elevenLabsVoiceExists) {
			continue;
		}

		let files: Blob[] = [];

		if (isArray(url)) {
			files = await Promise.all(
				url.map(async (url) => {
					const response = await fetch(url);
					const blob = await response.blob();
					return blob;
				})
			);
		} else {
			const response = await fetch(url);
			files.push(await response.blob());
		}

		await app.elevenlabs.client.voices.add({
			files,
			name
		});
	}

	if (!data.voices.find((voice) => voice.name === 'Annoying')) {
		await app.elevenlabs.client.voices.addSharingVoice(
			'1c07ef5740387faa0fd1f7e624ce51055c0b270674ab3da0f0e22c2882bce3c4',
			'dfZGXKiIzjizWtJ0NgPy',
			{
				new_name: 'Annoying'
			}
		);
	}

	if (data.voices.find((voice) => voice.name === 'Heidrich') === undefined) {
		app.elevenlabs.client?.voices.addSharingVoice(
			'1c07ef5740387faa0fd1f7e624ce51055c0b270674ab3da0f0e22c2882bce3c4',
			'LRpNiUBlcqgIsKUzcrlN',
			{
				new_name: 'Heidrich'
			}
		);

		console.log('TTS Module: added Heidrich voice');
	}
}
