import type {
	Create,
	PlayerLikesResponse,
	PlayerVoteScoresResponse,
	Update
} from '$core/pocketbase/types';
import { pocketbase } from '$core/pocketbase';
import { fetch } from '$core/http/fetch';
import { account } from '$core/account';
import { voteFromRecord, type CommentVoteValue } from '@company-of-heroes/ui/comment';

export type PlayerLike = PlayerLikesResponse;

function escapePocketBaseString(value: string) {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Up/down votes on player profiles (by Steam ID).
 */
export class PlayerSocial {
	#userId() {
		return pocketbase.authStore.record?.id ?? account.userId;
	}

	async getLikeCount(steamId: string): Promise<number> {
		const id = steamId.trim();
		if (!id) {
			return 0;
		}

		try {
			const score = await pocketbase
				.collection('player_vote_scores')
				.getFirstListItem<PlayerVoteScoresResponse>(
					`steamId = "${escapePocketBaseString(id)}"`,
					{ fields: 'likeCount', fetch }
				);
			return Number(score.likeCount) || 0;
		} catch {
			return 0;
		}
	}

	async getMyVote(steamId: string): Promise<CommentVoteValue> {
		const userId = this.#userId();
		const id = steamId.trim();
		if (!userId || !id) {
			return 0;
		}

		try {
			const existing = await pocketbase
				.collection('player_likes')
				.getFirstListItem<PlayerLike>(
					`steamId = "${escapePocketBaseString(id)}" && user = "${userId}"`,
					{ fields: 'value', fetch }
				);
			return voteFromRecord(existing.value);
		} catch {
			return 0;
		}
	}

	async setPlayerVote(
		steamId: string,
		value: 1 | -1
	): Promise<{ vote: CommentVoteValue; likeCount: number }> {
		const userId = this.#userId();
		const id = steamId.trim();
		let vote: CommentVoteValue = value;
		try {
			const existing = await pocketbase
				.collection('player_likes')
				.getFirstListItem<PlayerLike>(
					`steamId = "${escapePocketBaseString(id)}" && user = "${userId}"`,
					{ fetch }
				);
			const current = voteFromRecord(existing.value);
			if (current === value) {
				await pocketbase.collection('player_likes').delete(existing.id, { fetch });
				vote = 0;
			} else {
				const data: Update<'player_likes'> = { value };
				await pocketbase.collection('player_likes').update(existing.id, data, { fetch });
			}
		} catch {
			const data: Create<'player_likes'> = {
				steamId: id,
				user: userId,
				value
			};
			await pocketbase.collection('player_likes').create(data, { fetch });
		}

		return { vote, likeCount: await this.getLikeCount(id) };
	}
}
