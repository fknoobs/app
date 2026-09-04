export type ApiError = {
	status: number;
	message: string;
	retryAfter?: number;
};

export function apiError(
	status: number,
	message: string,
	extra?: { retryAfter?: number }
): ApiError {
	return extra?.retryAfter !== undefined
		? { status, message, retryAfter: extra.retryAfter }
		: { status, message };
}

export function isApiError(value: unknown): value is ApiError {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	const candidate = value as { status?: unknown; message?: unknown };
	return typeof candidate.status === 'number' && typeof candidate.message === 'string';
}

export function fromUnknown(
	error: unknown,
	fallback = 'Something went wrong. Please try again later.'
): ApiError {
	if (isApiError(error)) {
		return error;
	}

	return apiError(500, fallback);
}
