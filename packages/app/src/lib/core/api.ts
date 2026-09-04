import { createApi, unwrapApi } from '@company-of-heroes/api';
import { pocketbase } from '$core/pocketbase';
import { fetch } from '$core/http/fetch';
import { PUBLIC_PB_URL } from '$env/static/public';
import { account } from '$core/account';

export const api = createApi({
	pocketbase,
	fetch,
	baseUrl: PUBLIC_PB_URL ?? 'https://api.coh1stats.com',
	userId: () => pocketbase.authStore.record?.id ?? account.userId
});

export { unwrapApi };
