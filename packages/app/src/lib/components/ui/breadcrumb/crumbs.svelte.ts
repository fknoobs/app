import { Context } from 'runed';

export type Crumb = {
	label: string;
	href?: string;
};

const NESTED_FALLBACK: Record<string, string> = {
	replays: 'Replay',
	history: 'Match',
	players: 'Player',
	live: 'Live lobby'
};

const SECTIONS: Record<string, string> = {
	replays: 'Replays',
	history: 'History',
	shortcuts: 'Keybindings',
	leaderboards: 'Leaderboards',
	players: 'Players',
	twitch: 'Twitch',
	settings: 'Settings',
	account: 'Account',
	admin: 'Management'
};

class Breadcrumbs {
	extra = $state<Crumb[]>([]);

	setExtra(items: Crumb[]) {
		this.extra = items;
	}
}

const context = new Context<Breadcrumbs>('<breadcrumbs />');

export const createBreadcrumbs = () => context.set(new Breadcrumbs());
export const useBreadcrumbs = () => context.get();

export function crumbsFromPath(pathname: string, extra: Crumb[]): Crumb[] {
	const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);

	if (parts.length === 0) {
		return [{ label: 'Dashboard' }];
	}

	if (parts[0] === 'current-game') {
		return [{ label: 'Dashboard', href: '/' }, extra[0] ?? { label: 'Current game' }];
	}

	if (parts[0] === 'live') {
		return [{ label: 'Dashboard', href: '/' }, extra[0] ?? { label: 'Live lobby' }];
	}

	const sectionLabel = SECTIONS[parts[0]];
	if (!sectionLabel) {
		return extra.length > 0 ? extra : [{ label: parts[0] }];
	}

	if (parts.length === 1) {
		return [{ label: sectionLabel }];
	}

	const rest =
		extra.length > 0 ? extra : [{ label: NESTED_FALLBACK[parts[0]] ?? parts[1] ?? sectionLabel }];

	return [{ label: sectionLabel, href: `/${parts[0]}` }, ...rest];
}
