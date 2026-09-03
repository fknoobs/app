import PocketBase, { ClientResponseError, type RecordModel } from 'pocketbase';
import { err, errAsync, ok, okAsync, Result, ResultAsync } from 'neverthrow';
import { appError, fromUnknown, type AppError } from '$lib/errors/app-error';

export class HiddenMatchesService {
	constructor(private pocketbase: PocketBase) {}

	isHidden(sessionId: number): ResultAsync<boolean, AppError> {
		if (!this.isStaff() || !Number.isInteger(sessionId) || sessionId <= 0) {
			return okAsync(false);
		}

		return this.find(sessionId).map((record) => !!record);
	}

	hide(sessionId: number): ResultAsync<void, AppError> {
		const staff = this.requireStaff();
		if (staff.isErr()) {
			return errAsync(staff.error);
		}

		if (!Number.isInteger(sessionId) || sessionId <= 0) {
			return errAsync(appError(400, 'Could not hide this match.'));
		}

		return ResultAsync.fromPromise(
			this.pocketbase.collection('hidden_matches').create({
				sessionId,
				hiddenBy: staff.value
			}),
			(error) => toHiddenError(error, 'Could not hide this match.')
		)
			.map(() => undefined)
			.orElse((error) => (error.status === 400 ? ok(undefined) : err(error)));
	}

	unhide(sessionId: number): ResultAsync<void, AppError> {
		const staff = this.requireStaff();
		if (staff.isErr()) {
			return errAsync(staff.error);
		}

		if (!Number.isInteger(sessionId) || sessionId <= 0) {
			return errAsync(appError(400, 'Could not show this match.'));
		}

		return this.find(sessionId).andThen((record) => {
			if (!record) {
				return okAsync(undefined);
			}

			return ResultAsync.fromPromise(
				this.pocketbase.collection('hidden_matches').delete(record.id),
				(error) => toHiddenError(error, 'Could not show this match.')
			).map(() => undefined);
		});
	}

	private find(sessionId: number): ResultAsync<RecordModel | null, AppError> {
		return ResultAsync.fromPromise(
			this.pocketbase.collection('hidden_matches').getFirstListItem(`sessionId=${sessionId}`),
			(error) => {
				if (error instanceof ClientResponseError && error.status === 404) {
					return appError(404, 'Could not load hidden matches.');
				}

				return fromUnknown(error, 'Could not load hidden matches.');
			}
		).orElse((error) => (error.status === 404 ? ok(null) : err(error)));
	}

	private isStaff(): boolean {
		if (!this.pocketbase.authStore.isValid) {
			return false;
		}

		const role = this.pocketbase.authStore.record?.role;
		return role === 'admin' || role === 'moderator';
	}

	private requireStaff(): Result<string, AppError> {
		const id = this.pocketbase.authStore.isValid
			? (this.pocketbase.authStore.record?.id ?? '')
			: '';
		if (!id) {
			return err(appError(401, 'Log in to do that.'));
		}

		if (!this.isStaff()) {
			return err(appError(403, 'Log in to do that.'));
		}

		return ok(id);
	}
}

function toHiddenError(error: unknown, fallback: string): AppError {
	if (error instanceof ClientResponseError) {
		if (error.status === 401 || error.status === 403) {
			return appError(401, 'Log in to do that.');
		}

		if (error.status === 400) {
			return appError(400, fallback);
		}
	}

	return fromUnknown(error, fallback);
}
