import { app } from '$lib/state/app.svelte';
import type { HelixCustomReward } from '@twurple/api';
import type { EventSubSubscription } from '@twurple/eventsub';
import { Module } from './module.svelte';

export class TTSPersonal extends Module {
	/**
	 * Indicates whether TTS Personal is enabled.
	 * Can only be used if ElevenLabs and Twitch are enabled.
	 *
	 * @readonly
	 * @type {boolean}
	 */
	enabled = $derived(app.elevenlabs.enabled && app.twitch.enabled);

	voices = $derived(app.settings.tts.personalVoices);

	rewards: HelixCustomReward[] = $state([]);

	eventSubscription: EventSubSubscription | undefined = $state();

	activeVoices: Record<string, string> = $state({});

	async init() {
		if (!app.twitch.user?.userId) {
			return;
		}

		this.rewards = await app.twitch.client!.channelPoints.getCustomRewards(
			app.twitch.user.userId,
			true
		);

		//await app.store.set('activeVoices', {});
		this.activeVoices = (await app.store.get('activeVoices')) ?? {};

		this.updateChannelRewards();
		this.listenForRewardRedemption();

		$effect.root(() => {
			$effect(() => {
				this.activeVoices;
				this.updateChannelRewards();
			});
		});
	}

	private async updateChannelRewards() {
		const existingRewards = this.rewards.filter((reward) =>
			reward.title.startsWith('[PERSONALITY]')
		);

		/**
		 * Delete existing rewards that start with [PERSONALITY]
		 * This is to ensure that we don't have duplicates
		 */
		for (const reward of existingRewards) {
			await app.twitch.client!.channelPoints.deleteCustomReward(
				app.twitch.user!.userId!,
				reward.id
			);
		}

		for (const voice of this.voices) {
			app.twitch.client!.channelPoints.createCustomReward(app.twitch.user!.userId!, {
				title: `[PERSONALITY] ${voice}`,
				cost: 50000,
				backgroundColor: '#c10000',
				prompt: `${voice} will be your personality during live streams. All messages you send will be read in this voice. Preview voices at https://fknoobs.com/`,
				autoFulfill: true
			});
		}
	}

	listenForRewardRedemption() {
		this.eventSubscription = app.twitch.events?.onChannelRedemptionAdd(
			app.twitch.user!.userId!,
			async (reward) => {
				if (reward.rewardTitle.startsWith('[PERSONALITY]')) {
					const voice = reward.rewardTitle.replace('[PERSONALITY] ', '');

					this.activeVoices[reward.userName] = voice;
					app.store.set('activeVoices', this.activeVoices);
					console.log(this.activeVoices);
				}
			}
		);
	}

	destroy(): void {
		this.eventSubscription?.stop();
	}
}
