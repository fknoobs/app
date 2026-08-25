import type {
	ReplaysResponse,
	Create,
	Update,
	ReplaysRecord,
	UsersResponse
} from '$core/pocketbase/types';
import type { Expand } from '@fknoobs/app';
import type { Message, Player } from '@fknoobs/replay-parser';
import { setReplayName } from '@fknoobs/replay-parser';
import type { ListResult } from 'pocketbase';
import { exp, getFile, pocketbase } from '$core/pocketbase';
import { fetch } from '$core/http/fetch';
import { account } from '$core/account';
import { app } from '$core/app/context';
import { join } from '@tauri-apps/api/path';
import { exists, writeFile } from '@tauri-apps/plugin-fs';

export type ReplaysExpanded = Expand<
	ReplaysResponse<Message[], Player[], { createdBy: UsersResponse }>
>;

export type ReplayDetail = {
	bytes: Uint8Array;
	/** Set when the id belongs to the `replays` collection; null for lobby fallbacks. */
	record: ReplaysRecord | null;
};

/**
 * Replay repository.
 */
export class Replays {
	/** Retrieves a paginated list of replays. */
	async getPaginated(
		page = 1,
		perPage = 50,
		{
			filter = '',
			fields = [],
			sort = '-gameDate'
		}: { filter?: string; fields?: (keyof ReplaysRecord)[]; sort?: string } = {}
	): Promise<ListResult<ReplaysExpanded>> {
		const response = await pocketbase
			.collection('replays')
			.getList<ReplaysResponse<Message[], Player[]>>(page, perPage, {
				filter,
				fields: fields.join(','),
				sort,
				expand: 'createdBy',
				fetch
			});

		return {
			...response,
			items: response.items.map(exp) as unknown as ReplaysExpanded[]
		};
	}

	async getAll(): Promise<ReplaysExpanded[]> {
		const response = await pocketbase
			.collection('replays')
			.getFullList<ReplaysResponse<Message[], Player[]>>(1000, {
				expand: 'createdBy',
				fetch
			});

		return response.map(exp) as unknown as ReplaysExpanded[];
	}

	/**
	 * Loads replay bytes plus the `replays` record when available.
	 * Falls back to the lobby replay file (record is then null).
	 */
	async getDetail(id: string): Promise<ReplayDetail> {
		try {
			const record = await pocketbase.collection('replays').getOne<ReplaysRecord>(id, { fetch });
			const bytes = await getFile(record, record.file);
			return { bytes, record };
		} catch {
			const lobby = await pocketbase.collection('lobbies').getOne(id, { fetch });
			const bytes = await getFile(lobby, lobby.replay);
			return { bytes, record: null };
		}
	}

	/**
	 * Retrieves the raw replay file by record ID. Falls back to the match
	 * (lobby) record's replay file for links created from match pages.
	 */
	async getById(id: string): Promise<Uint8Array> {
		const { bytes } = await this.getDetail(id);
		return bytes;
	}

	/**
	 * Rewrites `replayName` in the `.rec` binary, updates PocketBase title/file,
	 * and writes the local playback copy when `filename` still exists on disk.
	 */
	async rename(id: string, replayName: string): Promise<{ bytes: Uint8Array; title: string }> {
		const record = await pocketbase.collection('replays').getOne<ReplaysRecord>(id, { fetch });
		const current = await getFile(record, record.file);
		const title = replayName.trim() || '-';
		const bytes = setReplayName(current, title === '-' ? '' : title);
		const file = new File([bytes], record.filename || record.file || 'replay.rec');

		await this.update(id, { title, file });

		if (record.filename) {
			try {
				const localPath = await join(await app.paths.cohPlaybackDir(), record.filename);
				if (await exists(localPath)) {
					await writeFile(localPath, bytes);
				}
			} catch (error) {
				console.warn('[REPLAYS]: failed to write renamed local replay', record.filename, error);
			}
		}

		return { bytes, title };
	}

	/** Retrieves a single replay by its filename. */
	async getByFilename(filename: string) {
		const records = await pocketbase.collection('replays').getFullList<ReplaysRecord>(20000, {
			filter: `filename="${filename}"`,
			requestKey: null,
			fetch
		});

		return records.length > 0 ? records[0] : null;
	}

	/** All replay filenames uploaded by the current user. */
	async getExistingFilenamesByUser(): Promise<string[]> {
		const records = await pocketbase.collection('replays').getFullList({
			filter: `createdBy = "${account.userId}"`,
			fields: 'filename',
			requestKey: null,
			fetch
		});

		return records.map((r) => r.filename);
	}

	async create(data: Omit<Create<'replays'>, 'createdBy'>) {
		return await pocketbase.collection('replays').create(
			{
				createdBy: pocketbase.authStore.record?.id ?? account.userId,
				...data
			},
			{ fetch, requestKey: null }
		);
	}

	async update(id: string, data: Update<'replays'>) {
		return await pocketbase.collection('replays').update(id, data, { fetch });
	}

	async delete(id: string) {
		return await pocketbase.collection('replays').delete(id, { fetch });
	}
}
