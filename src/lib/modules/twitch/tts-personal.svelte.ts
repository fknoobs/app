import { app } from '$lib/state/app.svelte';
import type { HelixCustomReward } from '@twurple/api';
import type { EventSubSubscription } from '@twurple/eventsub';
import { Module } from '../module.svelte';
import type { Twitch } from './twitch.svelte';

export class TTSPersonal {
	voices = $derived(app.settings.tts.personalVoices);

	rewards: HelixCustomReward[] = $state([]);

	eventSubscription: EventSubSubscription | undefined = $state();

	activeVoices: Record<string, string> = $state({});

	twitch: Twitch;

	constructor() {
		this.twitch = app.getModule('twitch');
	}

	async init() {
		if (!this.twitch.user?.userId) {
			return;
		}

		this.rewards = await this.twitch.client!.channelPoints.getCustomRewards(
			this.twitch.user.userId,
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
			await this.twitch.client!.channelPoints.deleteCustomReward(
				this.twitch.user!.userId!,
				reward.id
			);
		}

		for (const voice of this.voices) {
			this.twitch.client!.channelPoints.createCustomReward(this.twitch.user!.userId!, {
				title: `[PERSONALITY] ${voice}`,
				cost: 50000,
				backgroundColor: '#c10000',
				prompt: `${voice} will be your personality during live streams. All messages you send will be read in this voice. Preview voices at https://fknoobs.com/`,
				autoFulfill: true
			});
		}
	}

	listenForRewardRedemption() {
		this.eventSubscription = this.twitch.eventSub?.onChannelRedemptionAdd(
			this.twitch.user!.userId!,
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
