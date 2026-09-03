export type AppError = {
	status: number;
	message: string;
	retryAfter?: number;
};

export function appError(
	status: number,
	message: string,
	extra?: { retryAfter?: number }
): AppError {
	return extra?.retryAfter !== undefined
		? { status, message, retryAfter: extra.retryAfter }
		: { status, message };
}

export function isAppError(value: unknown): value is AppError {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	const candidate = value as { status?: unknown; message?: unknown };
	return typeof candidate.status === 'number' && typeof candidate.message === 'string';
}

export function fromUnknown(
	error: unknown,
	fallback = 'Something went wrong. Please try again later.'
): AppError {
	if (isAppError(error)) {
		return error;
	}

	return appError(500, fallback);
}
