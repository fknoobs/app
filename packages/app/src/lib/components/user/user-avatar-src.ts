import { getFileUrl } from '$core/pocketbase';
import { createAvatar } from '@dicebear/core';
import { adventurerNeutral } from '@dicebear/collection';

export type UserAvatarRecord = {
	id: string;
	name?: string;
	avatar?: string;
	collectionId?: string;
	collectionName?: string;
};

export function userAvatarSrc(user: UserAvatarRecord) {
	if (user.avatar && user.id) {
		return getFileUrl(
			{
				id: user.id,
				collectionId: user.collectionId || '_pb_users_auth_',
				collectionName: user.collectionName || 'users'
			},
			user.avatar
		);
	}

	return createAvatar(adventurerNeutral, { seed: user.id, size: 128 }).toDataUri();
}
