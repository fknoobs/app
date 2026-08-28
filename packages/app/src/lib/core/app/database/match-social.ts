import type {
	Create,
	LobbyCommentLikesResponse,
	LobbyCommentsResponse,
	LobbyLikesResponse,
	Update,
	UsersResponse
} from '$core/pocketbase/types';
import type { Expand } from '@fknoobs/app';
import { exp, pocketbase } from '$core/pocketbase';
import { fetch } from '$core/http/fetch';
import { account } from '$core/account';

export type LobbyLike = LobbyLikesResponse;
export type LobbyComment = Expand<
	LobbyCommentsResponse<{
		user: UsersResponse<Record<string, any>, string[]>;
	}>
> & {
	liked: boolean;
};

function recordId(value: unknown): string {
	if (!value) return '';
	if (typeof value === 'object' && 'id' in value) return String((value as { id: string }).id);
	return String(value);
}

/**
 * Likes, comments, and unique download tracking for saved matches.
 */
export class MatchSocial {
	#userId() {
		return pocketbase.authStore.record?.id ?? account.userId;
	}

	async getMyLike(lobbyId: string): Promise<LobbyLike | null> {
		const userId = this.#userId();
		if (!userId) return null;
		try {
			return await pocketbase
				.collection('lobby_likes')
				.getFirstListItem<LobbyLike>(`lobby = "${lobbyId}" && user = "${userId}"`, { fetch });
		} catch {
			return null;
		}
	}

	async toggleLike(lobbyId: string): Promise<{ liked: boolean }> {
		const existing = await this.getMyLike(lobbyId);
		if (existing) {
			await pocketbase.collection('lobby_likes').delete(existing.id, { fetch });
			return { liked: false };
		}
		const data: Create<'lobby_likes'> = {
			lobby: lobbyId,
			user: this.#userId()
		};
		await pocketbase.collection('lobby_likes').create(data, { fetch });
		return { liked: true };
	}

	async listMyCommentLikes(commentIds: string[]): Promise<Set<string>> {
		const userId = this.#userId();
		if (!userId || commentIds.length === 0) return new Set();
		const liked = new Set<string>();
		const size = 40;
		try {
			for (let i = 0; i < commentIds.length; i += size) {
				const chunk = commentIds.slice(i, i + size);
				const likes = await pocketbase
					.collection('lobby_comment_likes')
					.getFullList<LobbyCommentLikesResponse>({
						filter: `user = "${userId}" && (${chunk.map((id) => `comment = "${id}"`).join(' || ')})`,
						fields: 'comment',
						fetch
					});
				for (const like of likes) liked.add(recordId(like.comment));
			}
		} catch {
			return new Set();
		}
		return liked;
	}

	async listComments(lobbyId: string): Promise<LobbyComment[]> {
		const response = await pocketbase.collection('lobby_comments').getList<LobbyCommentsResponse>(1, 200, {
			filter: `lobby = "${lobbyId}"`,
			sort: 'created',
			expand: 'user',
			fetch
		});
		const liked = await this.listMyCommentLikes(response.items.map((item) => item.id));
		return response.items.map((item) => {
			const comment = exp(item) as unknown as LobbyComment;
			comment.liked = liked.has(comment.id);
			return comment;
		});
	}

	async createComment(lobbyId: string, text: string, parentId?: string): Promise<LobbyComment> {
		const data: Create<'lobby_comments'> = {
			lobby: lobbyId,
			user: this.#userId(),
			text: text.trim(),
			...(parentId ? { parent: parentId } : {})
		};
		const record = await pocketbase.collection('lobby_comments').create<LobbyCommentsResponse>(data, {
			expand: 'user',
			fetch
		});
		const comment = exp(record) as unknown as LobbyComment;
		comment.liked = false;
		comment.likeCount = Number(comment.likeCount) || 0;
		return comment;
	}

	async toggleCommentLike(commentId: string): Promise<{ liked: boolean; likeCount: number }> {
		const userId = this.#userId();
		let liked = false;
		try {
			const existing = await pocketbase
				.collection('lobby_comment_likes')
				.getFirstListItem<LobbyCommentLikesResponse>(
					`comment = "${commentId}" && user = "${userId}"`,
					{ fetch }
				);
			await pocketbase.collection('lobby_comment_likes').delete(existing.id, { fetch });
		} catch {
			const data: Create<'lobby_comment_likes'> = {
				comment: commentId,
				user: userId
			};
			await pocketbase.collection('lobby_comment_likes').create(data, { fetch });
			liked = true;
		}
		try {
			const comment = await pocketbase
				.collection('lobby_comments')
				.getOne<LobbyCommentsResponse>(commentId, { fields: 'likeCount', fetch });
			return { liked, likeCount: Number(comment.likeCount) || 0 };
		} catch {
			return { liked, likeCount: 0 };
		}
	}

	async updateComment(commentId: string, text: string): Promise<LobbyComment> {
		const data: Update<'lobby_comments'> = { text: text.trim() };
		const record = await pocketbase
			.collection('lobby_comments')
			.update<LobbyCommentsResponse>(commentId, data, { expand: 'user', fetch });
		const comment = exp(record) as unknown as LobbyComment;
		comment.likeCount = Number(comment.likeCount) || 0;
		return comment;
	}

	async deleteComment(commentId: string): Promise<boolean> {
		return pocketbase.collection('lobby_comments').delete(commentId, { fetch });
	}

	async recordDownload(lobbyId: string): Promise<number> {
		const response = await pocketbase.send<{ downloadCount: number }>(
			`/api/lobbies/${lobbyId}/download`,
			{
				method: 'POST',
				fetch
			}
		);
		return Number(response.downloadCount) || 0;
	}
}
