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
import { voteFromRecord, type CommentVoteValue } from '@company-of-heroes/ui/comment';

export type LobbyLike = LobbyLikesResponse;
export type LobbyComment = Expand<
	LobbyCommentsResponse<{
		user: UsersResponse<Record<string, any>, string[]>;
	}>
> & {
	vote: CommentVoteValue;
};

function recordId(value: unknown): string {
	if (!value) return '';
	if (typeof value === 'object' && 'id' in value) return String((value as { id: string }).id);
	return String(value);
}

export type MentionUser = {
	id: string;
	name: string;
	avatar?: string;
	collectionId?: string;
	collectionName?: string;
	steamIds?: string[];
};

function escapePocketBaseString(value: string) {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Likes, comments, and unique download tracking for saved matches.
 */
export class MatchSocial {
	#userId() {
		return pocketbase.authStore.record?.id ?? account.userId;
	}

	async searchMentionUsers(query: string): Promise<MentionUser[]> {
		const q = query.trim();
		if (q.length < 1) return [];
		const escaped = escapePocketBaseString(q);
		const me = this.#userId();
		try {
			const response = await pocketbase.collection('users').getList<UsersResponse>(1, 6, {
				filter: `name ~ "${escaped}" && name != ""${me ? ` && id != "${me}"` : ''}`,
				fields: 'id,name,avatar,collectionId,collectionName,steamIds',
				sort: 'name',
				fetch
			});
			return response.items
				.map((user) => ({
					id: user.id,
					name: String(user.name || '').trim(),
					avatar: user.avatar || '',
					collectionId: user.collectionId,
					collectionName: user.collectionName,
					steamIds: Array.isArray(user.steamIds) ? user.steamIds.map(String) : []
				}))
				.filter((user) => user.name);
		} catch {
			return [];
		}
	}

	async getMyVote(lobbyId: string): Promise<CommentVoteValue> {
		const userId = this.#userId();
		if (!userId) return 0;
		try {
			const existing = await pocketbase
				.collection('lobby_likes')
				.getFirstListItem<LobbyLike>(`lobby = "${lobbyId}" && user = "${userId}"`, {
					fields: 'value',
					fetch
				});
			return voteFromRecord(existing.value);
		} catch {
			return 0;
		}
	}

	async setLobbyVote(
		lobbyId: string,
		value: 1 | -1
	): Promise<{ vote: CommentVoteValue; likeCount: number }> {
		const userId = this.#userId();
		let vote: CommentVoteValue = value;
		try {
			const existing = await pocketbase
				.collection('lobby_likes')
				.getFirstListItem<LobbyLike>(`lobby = "${lobbyId}" && user = "${userId}"`, { fetch });
			const current = voteFromRecord(existing.value);
			if (current === value) {
				await pocketbase.collection('lobby_likes').delete(existing.id, { fetch });
				vote = 0;
			} else {
				const data: Update<'lobby_likes'> = { value };
				await pocketbase.collection('lobby_likes').update(existing.id, data, { fetch });
			}
		} catch {
			const data: Create<'lobby_likes'> = {
				lobby: lobbyId,
				user: userId,
				value
			};
			await pocketbase.collection('lobby_likes').create(data, { fetch });
		}

		try {
			const lobby = await pocketbase.collection('lobbies').getOne(lobbyId, {
				fields: 'likeCount',
				fetch
			});
			return { vote, likeCount: Number(lobby.likeCount) || 0 };
		} catch {
			return { vote, likeCount: 0 };
		}
	}

	async listMyCommentVotes(commentIds: string[]): Promise<Map<string, 1 | -1>> {
		const userId = this.#userId();
		const votes = new Map<string, 1 | -1>();
		if (!userId || commentIds.length === 0) {
			return votes;
		}

		const size = 40;
		try {
			for (let i = 0; i < commentIds.length; i += size) {
				const chunk = commentIds.slice(i, i + size);
				const likes = await pocketbase
					.collection('lobby_comment_likes')
					.getFullList<LobbyCommentLikesResponse>({
						filter: `user = "${userId}" && (${chunk.map((id) => `comment = "${id}"`).join(' || ')})`,
						fields: 'comment,value',
						fetch
					});
				for (const like of likes) {
					votes.set(recordId(like.comment), voteFromRecord(like.value));
				}
			}
		} catch {
			return votes;
		}

		return votes;
	}

	async listComments(lobbyId: string): Promise<LobbyComment[]> {
		const response = await pocketbase.collection('lobby_comments').getList<LobbyCommentsResponse>(1, 200, {
			filter: `lobby = "${lobbyId}"`,
			sort: 'created',
			expand: 'user',
			fetch
		});
		const votes = await this.listMyCommentVotes(response.items.map((item) => item.id));
		return response.items.map((item) => {
			const comment = exp(item) as unknown as LobbyComment;
			comment.vote = votes.get(comment.id) ?? 0;
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
		comment.vote = 0;
		comment.likeCount = Number(comment.likeCount) || 0;
		return comment;
	}

	async setCommentVote(
		commentId: string,
		value: 1 | -1
	): Promise<{ vote: CommentVoteValue; likeCount: number }> {
		const userId = this.#userId();
		let vote: CommentVoteValue = value;
		try {
			const existing = await pocketbase
				.collection('lobby_comment_likes')
				.getFirstListItem<LobbyCommentLikesResponse>(
					`comment = "${commentId}" && user = "${userId}"`,
					{ fetch }
				);
			const current = voteFromRecord(existing.value);
			if (current === value) {
				await pocketbase.collection('lobby_comment_likes').delete(existing.id, { fetch });
				vote = 0;
			} else {
				await pocketbase.collection('lobby_comment_likes').update(existing.id, { value }, { fetch });
			}
		} catch {
			const data: Create<'lobby_comment_likes'> = {
				comment: commentId,
				user: userId,
				value
			};
			await pocketbase.collection('lobby_comment_likes').create(data, { fetch });
		}

		try {
			const comment = await pocketbase
				.collection('lobby_comments')
				.getOne<LobbyCommentsResponse>(commentId, { fields: 'likeCount', fetch });
			return { vote, likeCount: Number(comment.likeCount) || 0 };
		} catch {
			return { vote, likeCount: 0 };
		}
	}

	async updateComment(commentId: string, text: string): Promise<LobbyComment> {
		const data: Update<'lobby_comments'> = { text: text.trim() };
		const record = await pocketbase
			.collection('lobby_comments')
			.update<LobbyCommentsResponse>(commentId, data, { expand: 'user', fetch });
		const comment = exp(record) as unknown as LobbyComment;
		comment.vote = 0;
		comment.likeCount = Number(comment.likeCount) || 0;
		return comment;
	}

	async deleteComment(commentId: string, note?: string): Promise<LobbyComment> {
		const data: Update<'lobby_comments'> = {
			deleted: true,
			...(note ? { deletedNote: note } : {})
		};
		const record = await pocketbase
			.collection('lobby_comments')
			.update<LobbyCommentsResponse>(commentId, data, { expand: 'user', fetch });
		const comment = exp(record) as unknown as LobbyComment;
		comment.vote = 0;
		comment.likeCount = Number(comment.likeCount) || 0;
		return comment;
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
