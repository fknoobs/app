import type { HTMLAttributes } from 'svelte/elements';
import SubscriptionBadge from './subscription-badge.svelte';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
	tier: 'free' | 'pro' | 'enterprise' | 'creator' | (string & {});
};

export { SubscriptionBadge };
