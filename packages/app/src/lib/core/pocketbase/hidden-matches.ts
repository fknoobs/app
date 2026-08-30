import { fetch } from '$core/http/fetch';
import { pocketbase } from '$core/pocketbase';
import type {
	HiddenMatchKeywordsResponse,
	HiddenMatchesResponse,
	UsersResponse
} from './types';

export type HiddenMatch = HiddenMatchesResponse<{ hiddenBy?: UsersResponse }>;
export type HiddenMatchKeyword = HiddenMatchKeywordsResponse<{ createdBy?: UsersResponse }>;

const KEYWORD_CACHE_MS = 30_000;
let keywordCache: { words: string[]; at: number } | null = null;

export function titleMatchesHiddenKeyword(
	title: string | null | undefined,
	words: string[]
): boolean {
	const text = String(title ?? '');
	if (!text || words.length === 0) return false;
	for (const word of words) {
		const trimmed = word.trim();
		if (!trimmed) continue;
		const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		if (new RegExp(`(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)`, 'i').test(text)) {
			return true;
		}
	}
	return false;
}

export function relicLobbyDescription(
	match:
		| {
				description?: string | null;
				result?: { description?: string | null } | null;
		  }
		| null
		| undefined
): string {
	if (!match) return '';
	if (typeof match.description === 'string' && match.description.trim()) {
		return match.description;
	}
	return String(match.result?.description ?? '');
}

export function isHiddenFromPublic(
	sessionId: number,
	description: string | null | undefined,
	hiddenIds: Set<number> | null | undefined,
	words: string[] | null | undefined
): boolean {
	if (sessionId > 0 && hiddenIds?.has(sessionId)) return true;
	return titleMatchesHiddenKeyword(description, words ?? []);
}

export function invalidateHiddenKeywordCache() {
	keywordCache = null;
}

export async function listHiddenMatches(): Promise<HiddenMatch[]> {
	return pocketbase.collection('hidden_matches').getFullList<HiddenMatch>({
		sort: '-created',
		expand: 'hiddenBy',
		fetch
	});
}

export async function listHiddenSessionIds(): Promise<Set<number>> {
	const rows = await pocketbase.collection('hidden_matches').getFullList<HiddenMatchesResponse>({
		fields: 'id,sessionId',
		fetch
	});
	return new Set(rows.map((row) => Number(row.sessionId)).filter((id) => id > 0));
}

export async function findHiddenMatch(sessionId: number): Promise<HiddenMatch | null> {
	if (!Number.isInteger(sessionId) || sessionId <= 0) {
		return null;
	}

	try {
		return await pocketbase
			.collection('hidden_matches')
			.getFirstListItem<HiddenMatch>(`sessionId=${sessionId}`, {
				expand: 'hiddenBy',
				fetch
			});
	} catch {
		return null;
	}
}

export async function hideMatch(sessionId: number, hiddenBy: string): Promise<HiddenMatch> {
	return pocketbase.collection('hidden_matches').create<HiddenMatch>(
		{
			sessionId,
			hiddenBy
		},
		{ fetch }
	);
}

export async function unhideMatch(sessionId: number): Promise<void> {
	const record = await findHiddenMatch(sessionId);
	if (!record) return;
	await pocketbase.collection('hidden_matches').delete(record.id, { fetch });
}

export async function listHiddenKeywords(): Promise<HiddenMatchKeyword[]> {
	return pocketbase.collection('hidden_match_keywords').getFullList<HiddenMatchKeyword>({
		sort: 'word',
		expand: 'createdBy',
		fetch
	});
}

export async function listHiddenKeywordWords(): Promise<string[]> {
	const now = Date.now();
	if (keywordCache && now - keywordCache.at < KEYWORD_CACHE_MS) {
		return keywordCache.words;
	}

	const rows = await pocketbase
		.collection('hidden_match_keywords')
		.getFullList<HiddenMatchKeywordsResponse>({
			fields: 'id,word',
			fetch
		});
	const words = rows.map((row) => String(row.word ?? '').trim()).filter(Boolean);
	keywordCache = { words, at: now };
	return words;
}

export async function addHiddenKeyword(word: string): Promise<HiddenMatchKeyword> {
	const created = await pocketbase.collection('hidden_match_keywords').create<HiddenMatchKeyword>(
		{ word: word.trim() },
		{ fetch }
	);
	invalidateHiddenKeywordCache();
	return created;
}

export async function deleteHiddenKeyword(id: string): Promise<void> {
	await pocketbase.collection('hidden_match_keywords').delete(id, { fetch });
	invalidateHiddenKeywordCache();
}

export async function filterPublicMatchHistory<T extends { id: number; description?: string }>(
	matches: T[]
): Promise<T[]> {
	const { account } = await import('$core/account');
	if (account.isStaff) return matches;
	const [ids, words] = await Promise.all([
		listHiddenSessionIds().catch(() => new Set<number>()),
		listHiddenKeywordWords().catch(() => [] as string[])
	]);
	return matches.filter(
		(match) => !ids.has(match.id) && !titleMatchesHiddenKeyword(match.description, words)
	);
}
