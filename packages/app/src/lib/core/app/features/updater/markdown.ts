import { Marked, type Tokens } from 'marked';

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function escapeAttr(value: string) {
	return escapeHtml(value);
}

function isSafeHref(href: string) {
	return /^https?:\/\//i.test(href.trim());
}

function isSafeImageSrc(src: string) {
	const trimmed = src.trim();
	return isSafeHref(trimmed) || trimmed.startsWith('/whats-new/');
}

const releaseMarkdown = new Marked({
	async: false,
	breaks: true,
	gfm: true,
	renderer: {
		html() {
			return '';
		},
		image({ href, title, text }: Tokens.Image) {
			if (!href || !isSafeImageSrc(href)) {
				return escapeHtml(text);
			}

			const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
			const alt = text ? ` alt="${escapeAttr(text)}"` : '';
			return `<img src="${escapeAttr(href)}"${alt}${titleAttr} />`;
		},
		link({ href, title, tokens }: Tokens.Link) {
			const inner = this.parser.parseInline(tokens);
			if (!href || !isSafeHref(href)) {
				return inner;
			}

			const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
			return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer"${titleAttr}>${inner}</a>`;
		}
	}
});

export function renderReleaseMarkdown(source: string): string {
	if (!source) {
		return '';
	}

	const html = releaseMarkdown.parse(source, { async: false });
	return typeof html === 'string' ? html : '';
}
