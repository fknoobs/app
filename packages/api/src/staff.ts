import { err, ok, type Result } from 'neverthrow';
import type { ApiDeps } from './deps';
import { apiError, type ApiError } from './errors';
import { currentUserId } from './pb';

export function isStaff(deps: ApiDeps): boolean {
	if (!deps.pocketbase.authStore.isValid) {
		return false;
	}

	const role = deps.pocketbase.authStore.record?.role;
	return role === 'admin' || role === 'moderator';
}

export function requireStaff(deps: ApiDeps): Result<string, ApiError> {
	const id = currentUserId(deps);
	if (!id) {
		return err(apiError(401, 'Log in to do that.'));
	}

	if (!isStaff(deps)) {
		return err(apiError(403, 'Log in to do that.'));
	}

	return ok(id);
}
