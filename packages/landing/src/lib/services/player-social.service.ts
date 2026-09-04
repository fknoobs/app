import PocketBase, { ClientResponseError } from 'pocketbase';
import { err, errAsync, ok, Result, ResultAsync } from 'neverthrow';
import { appError, fromUnknown, type AppError } from '$lib/errors/app-error';
import { voteFromRecord, type CommentVoteValue } from '@company-of-heroes/ui/comment';

function escapePocketBaseString(value: string) {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
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

export class PlayerSocialService {
	constructor(private pocketbase: PocketBase) {}

	getMyVote(steamId: string): ResultAsync<CommentVoteValue, AppError> {
		return ResultAsync.fromPromise(
			this.findMyVote(steamId),
			(error) => toSocialError(error, 'Failed to load vote.')
		);
	}

	setPlayerVote(
		steamId: string,
		value: 1 | -1
	): ResultAsync<{ vote: CommentVoteValue; likeCount: number }, AppError> {
		const auth = this.requireAuth();
		if (auth.isErr()) {
			return errAsync(auth.error);
		}

		return ResultAsync.fromPromise(
			this.setVoteRecord(steamId, auth.value, value),
			(error) => toSocialError(error, 'Failed to update vote.')
		);
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

	private async findMyVote(steamId: string): Promise<CommentVoteValue> {
		const userId = this.userId();
		const id = steamId.trim();
		if (!userId || !id) {
			return 0;
		}

		try {
			const existing = await this.pocketbase.collection('player_likes').getFirstListItem(
				`steamId = "${escapePocketBaseString(id)}" && user = "${userId}"`,
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

	private async getLikeCount(steamId: string): Promise<number> {
		const id = steamId.trim();
		if (!id) {
			return 0;
		}

		try {
			const score = await this.pocketbase.collection('player_vote_scores').getFirstListItem(
				`steamId = "${escapePocketBaseString(id)}"`,
				{ fields: 'likeCount' }
			);
			return Number(score.likeCount) || 0;
		} catch {
			return 0;
		}
	}

	private async setVoteRecord(
		steamId: string,
		userId: string,
		value: 1 | -1
	): Promise<{ vote: CommentVoteValue; likeCount: number }> {
		const id = steamId.trim();
		let vote: CommentVoteValue = value;
		try {
			const existing = await this.pocketbase
				.collection('player_likes')
				.getFirstListItem(`steamId = "${escapePocketBaseString(id)}" && user = "${userId}"`);
			const current = voteFromRecord(existing.value);
			if (current === value) {
				await this.pocketbase.collection('player_likes').delete(existing.id);
				vote = 0;
			} else {
				await this.pocketbase.collection('player_likes').update(existing.id, { value });
			}
		} catch (error) {
			if (!(error instanceof ClientResponseError) || error.status !== 404) {
				throw error;
			}

			await this.pocketbase.collection('player_likes').create({
				steamId: id,
				user: userId,
				value
			});
		}

		return { vote, likeCount: await this.getLikeCount(id) };
	}
}
