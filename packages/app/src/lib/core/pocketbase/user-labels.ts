import { fetch } from '$core/http/fetch';
import { pocketbase } from '$core/pocketbase';
import type { Create, PlayerLabelAssignmentsResponse, UserLabelsResponse } from './types';

export type UserLabel = UserLabelsResponse;
export type PlayerLabelAssignment = PlayerLabelAssignmentsResponse<{ label?: UserLabelsResponse }>;

export const DEFAULT_LABEL_HEX = '#F8C630';

const TOKEN_HEX: Record<string, string> = {
	primary: '#F8C630',
	default: '#A3A3A8',
	warning: '#E5B84C',
	success: '#3DBA63',
	info: '#3B8FD9',
	destructive: '#E5484D'
};

export const labelColorSwatches = [
	TOKEN_HEX.primary,
	TOKEN_HEX.default,
	TOKEN_HEX.warning,
	TOKEN_HEX.success,
	TOKEN_HEX.info,
	TOKEN_HEX.destructive
];

function escapeFilter(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function labelHex(color?: string | null): string {
	if (!color) return DEFAULT_LABEL_HEX;
	if (TOKEN_HEX[color]) return TOKEN_HEX[color];
	if (/^#[0-9A-Fa-f]{8}$/.test(color)) {
		return color.slice(0, 7);
	}
	if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color;
	if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
		return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
	}
	return DEFAULT_LABEL_HEX;
}

export function sortUserLabels(labels: UserLabelsResponse[]): UserLabelsResponse[] {
	return [...labels].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name));
}

export async function listUserLabels(): Promise<UserLabelsResponse[]> {
	return pocketbase.collection('user_labels').getFullList<UserLabelsResponse>({
		sort: 'sort,name',
		fetch
	});
}

export async function listAssignmentsForSteamIds(steamIds: string[]): Promise<PlayerLabelAssignment[]> {
	const ids = [...new Set(steamIds.filter(Boolean))];
	if (ids.length === 0) return [];
	const assignments: PlayerLabelAssignment[] = [];
	const size = 40;
	for (let i = 0; i < ids.length; i += size) {
		const chunk = ids.slice(i, i + size);
		const rows = await pocketbase
			.collection('player_label_assignments')
			.getFullList<PlayerLabelAssignment>({
				filter: chunk.map((id) => `steamId = "${escapeFilter(id)}"`).join(' || '),
				expand: 'label',
				fetch
			});
		assignments.push(...rows);
	}
	return assignments;
}

export function labelsBySteamId(
	assignments: PlayerLabelAssignment[]
): Record<string, UserLabelsResponse[]> {
	const bySteam: Record<string, UserLabelsResponse[]> = {};
	for (const assignment of assignments) {
		const steamId = assignment.steamId;
		const label = assignment.expand?.label;
		if (!steamId || !label) continue;
		const current = bySteam[steamId] ?? [];
		current.push(label);
		bySteam[steamId] = current;
	}
	for (const steamId of Object.keys(bySteam)) {
		bySteam[steamId] = sortUserLabels(bySteam[steamId]);
	}
	return bySteam;
}

export async function loadLabelsBySteamId(
	steamIds: string[]
): Promise<Record<string, UserLabelsResponse[]>> {
	return labelsBySteamId(await listAssignmentsForSteamIds(steamIds));
}

export async function assignPlayerLabel(data: {
	steamId: string;
	profileId: number;
	alias?: string;
	labelId: string;
}): Promise<PlayerLabelAssignment> {
	const record: Create<'player_label_assignments'> = {
		steamId: data.steamId,
		profileId: data.profileId,
		alias: data.alias,
		label: data.labelId
	};
	return pocketbase.collection('player_label_assignments').create<PlayerLabelAssignment>(record, {
		expand: 'label',
		fetch
	});
}

export async function unassignPlayerLabel(assignmentId: string): Promise<void> {
	await pocketbase.collection('player_label_assignments').delete(assignmentId, { fetch });
}
