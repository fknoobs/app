import { api, unwrapApi } from '$core/api';
import type {
	NotificationCreateInput,
	NotificationReadRecord,
	NotificationRecord
} from '@company-of-heroes/api';
import type { RecordSubscription, UnsubscribeFunc } from 'pocketbase';

export type { NotificationCreateInput, NotificationReadRecord, NotificationRecord };

/**
 * Notifications repository: broadcast/ targeted messages and per-user read state.
 */
export class Notifications {
	async listForUser(userId: string, limit = 10): Promise<NotificationRecord[]> {
		return unwrapApi(api.notifications.listForUser(userId, limit));
	}

	async listAll(limit = 50): Promise<NotificationRecord[]> {
		return unwrapApi(api.notifications.listAll(limit));
	}

	async getReadIds(userId: string): Promise<Set<string>> {
		return unwrapApi(api.notifications.getReadIds(userId));
	}

	async countUnread(userId: string): Promise<number> {
		return unwrapApi(api.notifications.countUnread(userId));
	}

	async create(input: NotificationCreateInput): Promise<NotificationRecord> {
		return unwrapApi(api.notifications.create(input));
	}

	async markAsRead(userId: string, notificationId: string): Promise<NotificationReadRecord> {
		return unwrapApi(api.notifications.markAsRead(userId, notificationId));
	}

	subscribe(
		callback: (event: RecordSubscription<NotificationRecord>) => void
	): Promise<UnsubscribeFunc> {
		return unwrapApi(api.notifications.subscribe(callback));
	}

	subscribeReads(
		userId: string,
		callback: (event: RecordSubscription<NotificationReadRecord>) => void
	): Promise<UnsubscribeFunc> {
		return unwrapApi(api.notifications.subscribeReads(userId, callback));
	}

	appliesToUser(notification: NotificationRecord, userId: string): boolean {
		return api.notifications.appliesToUser(notification, userId);
	}
}
