import PocketBase, { ClientResponseError, type RecordModel } from 'pocketbase';
import { err, errAsync, ok, okAsync, Result, ResultAsync } from 'neverthrow';
import { appError, fromUnknown, type AppError } from '$lib/errors/app-error';
import { voteFromRecord, type CommentVoteValue } from '@company-of-heroes/ui/comment';

export type CommentAuthor = {
	id: string;
	name: string;
	avatarUrl?: string;
	steamIds?: string[];
};

export type LobbyComment = {
	id: string;
	text: string;
	created: string;
	updated: string;
	parent: string;
	likeCount: number;
	vote: 1 | -1 | 0;
	deleted: boolean;
	deletedNote: string;
	user: CommentAuthor;
};

export type MentionUser = {
	id: string;
	name: string;
	avatarUrl?: string;
	steamIds?: string[];
};

type PbUser = RecordModel & {
	name?: string;
	avatar?: string;
	steamIds?: string[];
};

function escapePocketBaseString(value: string) {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function recordId(value: unknown): string {
	if (!value) {
		return '';
	}

	if (typeof value === 'object' && 'id' in value) {
		return String((value as { id: string }).id);
	}

	return String(value);
}

function toSocialError(error: unknown, fallback: string): AppError {
	if (error instanceof ClientResponseError) {
		if (error.status === 401 || error.status === 403) {
			return appError(401, 'Log in to do that.');
		}

		if (error.status === 404) {
			return appError(404, fallback);
		}

		if (error.status === 400) {
			return appError(400, fallback);
		}
	}

	return fromUnknown(error, fallback);
}

export class MatchSocialService {
	constructor(private pocketbase: PocketBase) {}

	searchMentionUsers(query: string): ResultAsync<MentionUser[], AppError> {
		const q = query.trim();
		if (q.length < 1) {
			return okAsync([]);
		}

		const escaped = escapePocketBaseString(q);
		const me = this.userId();
		const filter = `name ~ "${escaped}" && name != ""${me ? ` && id != "${me}"` : ''}`;

		return ResultAsync.fromPromise(
			this.pocketbase.collection('users').getList<PbUser>(1, 6, {
				filter,
				fields: 'id,name,avatar,collectionId,collectionName,steamIds',
				sort: 'name'
			}),
			(error) => toSocialError(error, 'Failed to search users.')
		).map((response) =>
			response.items
				.map((user) => this.serializeMention(user))
				.filter((user): user is MentionUser => user !== null)
		);
	}

	getMyVote(lobbyId: string): ResultAsync<CommentVoteValue, AppError> {
		return ResultAsync.fromPromise(
			this.findMyLobbyVote(lobbyId),
			(error) => toSocialError(error, 'Failed to load vote.')
		);
	}

	setLobbyVote(
		lobbyId: string,
		value: 1 | -1
	): ResultAsync<{ vote: CommentVoteValue; likeCount: number }, AppError> {
		const auth = this.requireAuth();
		if (auth.isErr()) {
			return errAsync(auth.error);
		}

		return ResultAsync.fromPromise(
			this.setLobbyVoteRecord(lobbyId, auth.value, value),
			(error) => toSocialError(error, 'Failed to update vote.')
		);
	}

	listComments(lobbyId: string): ResultAsync<LobbyComment[], AppError> {
		const escaped = escapePocketBaseString(lobbyId);
		return ResultAsync.fromPromise(
			this.pocketbase.collection('lobby_comments').getList(1, 200, {
				filter: `lobby = "${escaped}"`,
				sort: 'created',
				expand: 'user'
			}),
			(error) => toSocialError(error, 'Failed to load comments.')
		).andThen((response) =>
			ResultAsync.fromPromise(
				this.listMyCommentVotes(response.items.map((item) => item.id)),
				(error) => toSocialError(error, 'Failed to load comments.')
			).map((votes) =>
				response.items.map((item) => this.serializeComment(item, votes.get(item.id) ?? 0))
			)
		);
	}

	createComment(
		lobbyId: string,
		text: string,
		parentId?: string
	): ResultAsync<LobbyComment, AppError> {
		const auth = this.requireAuth();
		if (auth.isErr()) {
			return errAsync(auth.error);
		}

		const trimmed = text.trim();
		if (!trimmed) {
			return errAsync(appError(400, 'Enter a comment.'));
		}

		const data: Record<string, string> = {
			lobby: lobbyId,
			user: auth.value,
			text: trimmed
		};
		if (parentId) {
			data.parent = parentId;
		}

		return ResultAsync.fromPromise(
			this.pocketbase.collection('lobby_comments').create(data, { expand: 'user' }),
			(error) => toSocialError(error, 'Failed to post comment.')
		).map((record) => this.serializeComment(record, 0));
	}

	setCommentVote(
		commentId: string,
		value: 1 | -1
	): ResultAsync<{ vote: CommentVoteValue; likeCount: number }, AppError> {
		const auth = this.requireAuth();
		if (auth.isErr()) {
			return errAsync(auth.error);
		}

		return ResultAsync.fromPromise(
			this.setCommentVoteRecord(commentId, auth.value, value),
			(error) => toSocialError(error, 'Failed to update vote.')
		);
	}

	updateComment(commentId: string, text: string): ResultAsync<LobbyComment, AppError> {
		const auth = this.requireAuth();
		if (auth.isErr()) {
			return errAsync(auth.error);
		}

		const trimmed = text.trim();
		if (!trimmed) {
			return errAsync(appError(400, 'Enter a comment.'));
		}

		return ResultAsync.fromPromise(
			this.pocketbase.collection('lobby_comments').update(commentId, { text: trimmed }, { expand: 'user' }),
			(error) => toSocialError(error, 'Failed to update comment.')
		).map((record) => this.serializeComment(record, 0));
	}

	deleteComment(commentId: string, note?: string): ResultAsync<LobbyComment, AppError> {
		const auth = this.requireAuth();
		if (auth.isErr()) {
			return errAsync(auth.error);
		}

		const data: Record<string, unknown> = { deleted: true };
		if (note) {
			data.deletedNote = note;
		}

		return ResultAsync.fromPromise(
			this.pocketbase.collection('lobby_comments').update(commentId, data, { expand: 'user' }),
			(error) => toSocialError(error, 'Failed to delete comment.')
		).map((record) => this.serializeComment(record, 0));
	}

	private userId() {
		if (!this.pocketbase.authStore.isValid) {
			return '';
		}

		return this.pocketbase.authStore.record?.id ?? '';
	}

	private requireAuth(): Result<string, AppError> {
		const id = this.userId();
		if (!id) {
			return err(appError(401, 'Log in to do that.'));
		}

		return ok(id);
	}

	private serializeMention(user: PbUser): MentionUser | null {
		const name = String(user.name || '').trim();
		if (!user.id || !name) {
			return null;
		}

		return {
			id: user.id,
			name,
			avatarUrl: this.avatarUrl(user),
			steamIds: Array.isArray(user.steamIds) ? user.steamIds.map(String) : []
		};
	}

	private serializeComment(record: RecordModel, vote: CommentVoteValue): LobbyComment {
		const expand = record.expand as { user?: PbUser } | undefined;
		const author = expand?.user;
		const user: CommentAuthor = author
			? {
					id: author.id,
					name: String(author.name || '').trim() || 'Player',
					avatarUrl: this.avatarUrl(author),
					steamIds: Array.isArray(author.steamIds) ? author.steamIds.map(String) : []
				}
			: {
					id: recordId(record.user),
					name: 'Player'
				};

		return {
			id: record.id,
			text: String(record.text ?? ''),
			created: String(record.created ?? ''),
			updated: String(record.updated ?? ''),
			parent: recordId(record.parent),
			likeCount: Number(record.likeCount) || 0,
			vote,
			deleted: Boolean(record.deleted),
			deletedNote: String(record.deletedNote ?? ''),
			user
		};
	}

	private avatarUrl(user: PbUser) {
		if (!user.avatar) {
			return undefined;
		}

		return this.pocketbase.files.getURL(user, user.avatar);
	}

	private async findMyLobbyVote(lobbyId: string): Promise<CommentVoteValue> {
		const userId = this.userId();
		if (!userId) {
			return 0;
		}

		try {
			const existing = await this.pocketbase
				.collection('lobby_likes')
				.getFirstListItem(
					`lobby = "${escapePocketBaseString(lobbyId)}" && user = "${userId}"`,
					{ fields: 'value' }
				);
			return voteFromRecord(existing.value);
		} catch (error) {
			if (error instanceof ClientResponseError && error.status === 404) {
				return 0;
			}

			throw error;
		}
	}

	private async setLobbyVoteRecord(
		lobbyId: string,
		userId: string,
		value: 1 | -1
	): Promise<{ vote: CommentVoteValue; likeCount: number }> {
		let vote: CommentVoteValue = value;
		try {
			const existing = await this.pocketbase
				.collection('lobby_likes')
				.getFirstListItem(
					`lobby = "${escapePocketBaseString(lobbyId)}" && user = "${userId}"`
				);
			const current = voteFromRecord(existing.value);
			if (current === value) {
				await this.pocketbase.collection('lobby_likes').delete(existing.id);
				vote = 0;
			} else {
				await this.pocketbase.collection('lobby_likes').update(existing.id, { value });
			}
		} catch (error) {
			if (!(error instanceof ClientResponseError) || error.status !== 404) {
				throw error;
			}

			await this.pocketbase.collection('lobby_likes').create({
				lobby: lobbyId,
				user: userId,
				value
			});
		}

		try {
			const lobby = await this.pocketbase
				.collection('lobbies')
				.getOne(lobbyId, { fields: 'likeCount' });
			return { vote, likeCount: Number(lobby.likeCount) || 0 };
		} catch {
			return { vote, likeCount: 0 };
		}
	}

	private async listMyCommentVotes(commentIds: string[]): Promise<Map<string, 1 | -1>> {
		const userId = this.userId();
		const votes = new Map<string, 1 | -1>();
		if (!userId || commentIds.length === 0) {
			return votes;
		}

		const size = 40;
		for (let i = 0; i < commentIds.length; i += size) {
			const chunk = commentIds.slice(i, i + size);
			const likes = await this.pocketbase.collection('lobby_comment_likes').getFullList({
				filter: `user = "${userId}" && (${chunk.map((id) => `comment = "${id}"`).join(' || ')})`,
				fields: 'comment,value'
			});
			for (const like of likes) {
				votes.set(recordId(like.comment), voteFromRecord(like.value));
			}
		}

		return votes;
	}

	private async setCommentVoteRecord(
		commentId: string,
		userId: string,
		value: 1 | -1
	): Promise<{ vote: CommentVoteValue; likeCount: number }> {
		let vote: CommentVoteValue = value;
		try {
			const existing = await this.pocketbase
				.collection('lobby_comment_likes')
				.getFirstListItem(`comment = "${commentId}" && user = "${userId}"`);
			const current = voteFromRecord(existing.value);
			if (current === value) {
				await this.pocketbase.collection('lobby_comment_likes').delete(existing.id);
				vote = 0;
			} else {
				await this.pocketbase.collection('lobby_comment_likes').update(existing.id, { value });
			}
		} catch (error) {
			if (!(error instanceof ClientResponseError) || error.status !== 404) {
				throw error;
			}

			await this.pocketbase.collection('lobby_comment_likes').create({
				comment: commentId,
				user: userId,
				value
			});
		}

		try {
			const comment = await this.pocketbase
				.collection('lobby_comments')
				.getOne(commentId, { fields: 'likeCount' });
			return { vote, likeCount: Number(comment.likeCount) || 0 };
		} catch {
			return { vote, likeCount: 0 };
		}
	}
}
