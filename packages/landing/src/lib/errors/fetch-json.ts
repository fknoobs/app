import { errAsync, ResultAsync } from 'neverthrow';
import { appError, type AppError } from './app-error';

export function fetchJson<T>(
	fetchFn: typeof fetch,
	url: string,
	options: {
		fallback: string;
		onStatus?: (status: number) => AppError | undefined;
		init?: RequestInit;
	}
): ResultAsync<T, AppError> {
	return ResultAsync.fromPromise(fetchFn(url, options.init), () =>
		appError(500, options.fallback)
	).andThen((response) => {
		const mapped = options.onStatus?.(response.status);
		if (mapped) {
			return errAsync(mapped);
		}

		if (!response.ok) {
			return errAsync(appError(500, options.fallback));
		}

		return ResultAsync.fromPromise(response.json() as Promise<T>, () =>
			appError(500, options.fallback)
		);
	});
}
