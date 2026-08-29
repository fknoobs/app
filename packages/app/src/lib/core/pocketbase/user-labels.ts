import { fetch } from '$core/http/fetch';
import { pocketbase } from '$core/pocketbase';
import type { SemanticVariant } from '$lib/components/ui/variants';
import type {
	Create,
	UserLabelAssignmentsResponse,
	UserLabelsColorOptions,
	UserLabelsResponse
} from './types';

export type UserLabel = UserLabelsResponse;
export type UserLabelAssignment = UserLabelAssignmentsResponse<{ label?: UserLabelsResponse }>;

const LABEL_COLORS = [
	'primary',
	'default',
	'warning',
	'success',
	'info',
	'destructive'
] as const satisfies readonly UserLabelsColorOptions[];

export const userLabelColors: readonly UserLabelsColorOptions[] = LABEL_COLORS;

function escapeFilter(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function labelColor(color?: string): SemanticVariant | 'primary' {
	if (
		color === 'primary' ||
		color === 'default' ||
		color === 'warning' ||
		color === 'success' ||
		color === 'info' ||
		color === 'destructive'
	) {
		return color;
	}
	return 'primary';
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

export async function listAssignmentsForUsers(userIds: string[]): Promise<UserLabelAssignment[]> {
	const ids = [...new Set(userIds.filter(Boolean))];
	if (ids.length === 0) return [];
	const assignments: UserLabelAssignment[] = [];
	const size = 40;
	for (let i = 0; i < ids.length; i += size) {
		const chunk = ids.slice(i, i + size);
		const rows = await pocketbase.collection('user_label_assignments').getFullList<UserLabelAssignment>({
			filter: chunk.map((id) => `user = "${escapeFilter(id)}"`).join(' || '),
			expand: 'label',
			fetch
		});
		assignments.push(...rows);
	}
	return assignments;
}

export function labelsByUserId(assignments: UserLabelAssignment[]): Record<string, UserLabelsResponse[]> {
	const byUser: Record<string, UserLabelsResponse[]> = {};
	for (const assignment of assignments) {
		const userId = typeof assignment.user === 'string' ? assignment.user : '';
		const label = assignment.expand?.label;
		if (!userId || !label) continue;
		const current = byUser[userId] ?? [];
		current.push(label);
		byUser[userId] = current;
	}
	for (const userId of Object.keys(byUser)) {
		byUser[userId] = sortUserLabels(byUser[userId]);
	}
	return byUser;
}

export async function loadLabelsByUserId(userIds: string[]): Promise<Record<string, UserLabelsResponse[]>> {
	return labelsByUserId(await listAssignmentsForUsers(userIds));
}

export async function assignUserLabel(userId: string, labelId: string): Promise<UserLabelAssignment> {
	const data: Create<'user_label_assignments'> = {
		user: userId,
		label: labelId
	};
	return pocketbase.collection('user_label_assignments').create<UserLabelAssignment>(data, {
		expand: 'label',
		fetch
	});
}

export async function unassignUserLabel(assignmentId: string): Promise<void> {
	await pocketbase.collection('user_label_assignments').delete(assignmentId, { fetch });
}
