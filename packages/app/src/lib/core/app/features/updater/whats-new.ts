import { coerce, gt, lte, valid } from 'semver';
import { whatsNewFiles } from 'virtual:whats-new';
import { dev } from '$app/environment';

const VERSION_FILE = /^v(.+)\.md$/i;

export function normalizeVersion(version: string): string | null {
	const trimmed = version.trim();
	if (!trimmed) {
		return null;
	}

	const exact = valid(trimmed);
	if (exact) {
		return exact;
	}

	// Windows/MS Store builds can report 4-part versions like "0.52.4.0".
	return coerce(trimmed)?.version ?? null;
}

export type WhatsNewHighlight = {
	version: string;
	markdown: string;
};

type WhatsNewFile = {
	version: string;
	url: string;
};

function listed(): WhatsNewFile[] {
	const result: WhatsNewFile[] = [];

	for (const file of whatsNewFiles) {
		const match = VERSION_FILE.exec(file.name);
		if (!match?.[1]) {
			continue;
		}

		const version = normalizeVersion(match[1]);
		if (!version) {
			continue;
		}

		result.push({ version, url: file.url });
	}

	return result;
}

function newest(candidates: WhatsNewFile[]): WhatsNewFile | null {
	let best: WhatsNewFile | null = null;

	for (const file of candidates) {
		if (!best || gt(file.version, best.version)) {
			best = file;
		}
	}

	return best;
}

async function loadMarkdown(url: string): Promise<string> {
	const response = await fetch(url, { cache: dev ? 'no-store' : 'default' });
	if (!response.ok) {
		return '';
	}

	return response.text();
}

async function loadHighlight(file: WhatsNewFile | null): Promise<WhatsNewHighlight | null> {
	if (!file) {
		return null;
	}

	const markdown = (await loadMarkdown(file.url)).trim();
	if (!markdown) {
		return null;
	}

	return { version: file.version, markdown };
}

export function findLatestWhatsNew(): Promise<WhatsNewHighlight | null> {
	return loadHighlight(newest(listed()));
}

export function findWhatsNew(
	previous: string | null,
	current: string | null
): Promise<WhatsNewHighlight | null> {
	if (!current) {
		return Promise.resolve(null);
	}

	return loadHighlight(
		newest(
			listed().filter((file) => {
				if (previous && !gt(file.version, previous)) {
					return false;
				}

				return lte(file.version, current);
			})
		)
	);
}
