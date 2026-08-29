import type { ParamMatcher } from '@sveltejs/kit';
import { isPlayerId } from '$lib/steam-id';

export const match: ParamMatcher = (param) => isPlayerId(param);
