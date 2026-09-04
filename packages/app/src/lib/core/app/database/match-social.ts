import { api, unwrapApi } from '$core/api';
import type { LobbyComment as ApiLobbyComment, MentionUser } from '@company-of-heroes/api';
import type { CommentVoteValue } from '@company-of-heroes/ui/comment';

export type { MentionUser };

/** App comments may carry soft-delete metadata beyond the shared API shape. */
export type LobbyComment = ApiLobbyComment & {
	deletedAt?: string;
	deletedBy?: string | { id?: string; name?: string };
};

/**
 * Likes, comments, and unique download tracking for saved matches.
 */
export class MatchSocial {
	async searchMentionUsers(query: string): Promise<MentionUser[]> {
		try {
			return await unwrapApi(api.matchSocial.searchMentionUsers(query));
		} catch {
			return [];
		}
	}

	async getMyVote(lobbyId: string): Promise<CommentVoteValue> {
		try {
			return await unwrapApi(api.matchSocial.getMyVote(lobbyId));
		} catch {
			return 0;
		}
	}

	async setLobbyVote(
		lobbyId: string,
		value: 1 | -1
	): Promise<{ vote: CommentVoteValue; likeCount: number }> {
		return unwrapApi(api.matchSocial.setLobbyVote(lobbyId, value));
	}

	async listComments(lobbyId: string): Promise<LobbyComment[]> {
		return unwrapApi(api.matchSocial.listComments(lobbyId));
	}

	async createComment(lobbyId: string, text: string, parentId?: string): Promise<LobbyComment> {
		return unwrapApi(api.matchSocial.createComment(lobbyId, text, parentId));
	}

	async setCommentVote(
		commentId: string,
		value: 1 | -1
	): Promise<{ vote: CommentVoteValue; likeCount: number }> {
		return unwrapApi(api.matchSocial.setCommentVote(commentId, value));
	}

	async updateComment(commentId: string, text: string): Promise<LobbyComment> {
		return unwrapApi(api.matchSocial.updateComment(commentId, text));
	}

	async deleteComment(commentId: string, note?: string): Promise<LobbyComment> {
		return unwrapApi(api.matchSocial.deleteComment(commentId, note));
	}

	async recordDownload(lobbyId: string): Promise<number> {
		return unwrapApi(api.matchSocial.recordDownload(lobbyId));
	}
}
