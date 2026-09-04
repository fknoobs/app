import { api, unwrapApi } from '$core/api';
import type { CommentVoteValue } from '@company-of-heroes/ui/comment';

/**
 * Up/down votes on player profiles (by Steam ID).
 */
export class PlayerSocial {
	async getLikeCount(steamId: string): Promise<number> {
		try {
			return await unwrapApi(api.playerSocial.getLikeCount(steamId));
		} catch {
			return 0;
		}
	}

	async getMyVote(steamId: string): Promise<CommentVoteValue> {
		try {
			return await unwrapApi(api.playerSocial.getMyVote(steamId));
		} catch {
			return 0;
		}
	}

	async setPlayerVote(
		steamId: string,
		value: 1 | -1
	): Promise<{ vote: CommentVoteValue; likeCount: number }> {
		return unwrapApi(api.playerSocial.setPlayerVote(steamId, value));
	}
}
