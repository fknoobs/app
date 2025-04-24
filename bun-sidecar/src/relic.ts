import type { PersonalStat, RelicProfile } from './types';

export const RELIC_API_BASE = 'https://coh1-lobby.reliclink.com';

export class RelicClient {
	private readonly baseUrl: string;
	private readonly defaultFetchOptions: RequestInit;

	/**
	 * Constructs a new RelicClient instance.
	 *
	 * @param baseUrl - Base URL for the Relic API
	 * @param tlsRejectUnauthorized - Whether to reject unauthorized TLS certificates
	 */
	constructor(baseUrl: string = RELIC_API_BASE, tlsRejectUnauthorized: boolean = false) {
		this.baseUrl = baseUrl.replace(/\/+$/, '');
		this.defaultFetchOptions = {
			// @ts-ignore - Bun’s Node‐compat TLS option
			tls: { rejectUnauthorized: tlsRejectUnauthorized }
		};
	}

	/**
	 * Fetches the personal stat for a given Steam ID.
	 *
	 * @param steamId - The Steam ID (string or bigint)
	 * @returns The matching StatMember or null if not found
	 */
	async getProfileBySteamId(steamId: string | bigint): Promise<RelicProfile | null> {
		const result = await this.request<PersonalStat>(
			['community', 'leaderboard', 'getpersonalstat'],
			{
				title: 'coh1',
				profile_names: JSON.stringify([`/steam/${steamId}`])
			}
		);

		const members = result.statGroups?.[0]?.members ?? [];
		return members.find((m) => m.name === `/steam/${steamId}`) || null;
	}

	/**
	 * Fetches the personal stat for a given profile id.
	 *
	 * @param id - The profile id (number)
	 * @returns The matching StatMember or null if not found
	 */
	async getProfileById(id: number): Promise<RelicProfile | null> {
		const result = await this.request<PersonalStat>(
			['community', 'leaderboard', 'getpersonalstat'],
			{
				title: 'coh1',
				profile_ids: JSON.stringify([id])
			}
		);

		const members = result.statGroups?.[0]?.members ?? [];
		return members.find((m) => m.profile_id === id) || null;
	}

	/**
	 * Fetches the personal stat for a given list of profile ids.
	 *
	 * @param ids - The profile ids (array of numbers)
	 * @returns The matching StatMembers or an empty array if not found
	 */
	async getProfileByIds(ids: number[]): Promise<RelicProfile[]> {
		const result = await this.request<PersonalStat>(
			['community', 'leaderboard', 'getpersonalstat'],
			{
				title: 'coh1',
				profile_ids: JSON.stringify(ids)
			}
		);

		const members = result.statGroups?.map((statGroup) => statGroup.members.at(0)!) ?? [];
		return members.filter((m) => ids.includes(m.profile_id));
	}

	/**
	 * Performs a GET request against the API.
	 *
	 * @param pathSegments - URL path segments (will be URL‐encoded)
	 * @param queryParams - Key/value pairs for URL query string
	 */
	private async request<T>(
		pathSegments: string[],
		queryParams: Record<string, string | number> = {}
	): Promise<T> {
		const url = new URL(`${this.baseUrl}/${pathSegments.map(encodeURIComponent).join('/')}`);

		Object.entries(queryParams).forEach(([key, value]) =>
			url.searchParams.set(key, value.toString())
		);

		let response: Response;
		try {
			response = await fetch(url.toString(), this.defaultFetchOptions);
		} catch (err) {
			throw new RelicApiError('Network error while contacting Relic API', err);
		}

		if (!response.ok) {
			throw new RelicApiError(`Relic API returned HTTP ${response.status} ${response.statusText}`);
		}

		return (await response.json()) as T;
	}
}

/**
 * Thrown when something goes wrong with the Relic API call.
 */
export class RelicApiError extends Error {
	public readonly cause?: unknown;
	constructor(message: string, cause?: unknown) {
		super(message);
		this.name = 'RELIC_API_ERROR';
		this.cause = cause;
	}
}

export const relic = new RelicClient();
