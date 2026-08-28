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

const commentsMarkdown = new Marked({
	async: false,
	breaks: true,
	gfm: true,
	extensions: [
		{
			name: 'mark',
			level: 'inline',
			start(src: string) {
				const index = src.indexOf('==');
				return index < 0 ? undefined : index;
			},
			tokenizer(src: string) {
				const match = /^==([^=\n]+)==/.exec(src);
				if (!match) return;
				return {
					type: 'mark',
					raw: match[0],
					text: match[1],
					tokens: this.lexer.inlineTokens(match[1])
				};
			},
			renderer(token) {
				const inner = this.parser.parseInline(
					(token as Tokens.Generic & { tokens?: Tokens.Generic[] }).tokens ?? []
				);
				return `<mark>${inner}</mark>`;
			}
		}
	],
	renderer: {
		html() {
			return '';
		},
		image() {
			return '';
		},
		link({ href, title, tokens }: Tokens.Link) {
			const text = this.parser.parseInline(tokens);
			if (!href || !isSafeHref(href)) return text;
			const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
			return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer"${titleAttr}>${text}</a>`;
		}
	}
});

export function renderMarkdown(source: string): string {
	if (!source) return '';
	const html = commentsMarkdown.parse(source, { async: false });
	return typeof html === 'string' ? html : '';
}

export const COMMENT_MAX_LENGTH = 2000;

export type MarkdownSelectionEdit = {
	text: string;
	selectStart: number;
	selectEnd: number;
};

function range(start: number, end: number) {
	return { from: Math.max(0, Math.min(start, end)), to: Math.max(start, end) };
}

function fit(text: string, selectStart: number, selectEnd: number): MarkdownSelectionEdit | null {
	if (text.length > COMMENT_MAX_LENGTH) return null;
	return { text, selectStart, selectEnd };
}

export function wrapMarkdownSelection(
	source: string,
	start: number,
	end: number,
	before: string,
	after: string,
	placeholder: string
): MarkdownSelectionEdit | null {
	const { from, to } = range(start, end);
	let selected = source.slice(from, to);
	const wrapped =
		selected.startsWith(before) &&
		selected.endsWith(after) &&
		selected.length >= before.length + after.length;
	if (wrapped) {
		const inner = selected.slice(before.length, selected.length - after.length);
		return fit(source.slice(0, from) + inner + source.slice(to), from, from + inner.length);
	}
	const surrounded =
		source.slice(from - before.length, from) === before &&
		source.slice(to, to + after.length) === after;
	const italicInsideBold = before === '*' && source.slice(from - 2, from) === '**';
	if (surrounded && !italicInsideBold) {
		return fit(
			source.slice(0, from - before.length) + selected + source.slice(to + after.length),
			from - before.length,
			from - before.length + selected.length
		);
	}
	if (!selected) selected = placeholder;
	return fit(
		source.slice(0, from) + before + selected + after + source.slice(to),
		from + before.length,
		from + before.length + selected.length
	);
}

export function wrapMarkdownLink(
	source: string,
	start: number,
	end: number
): MarkdownSelectionEdit | null {
	const { from, to } = range(start, end);
	const selected = source.slice(from, to) || 'text';
	const url = 'https://';
	const text = `${source.slice(0, from)}[${selected}](${url})${source.slice(to)}`;
	const urlStart = from + selected.length + 3;
	return fit(text, urlStart, urlStart + url.length);
}

export function toggleMarkdownQuote(
	source: string,
	start: number,
	end: number
): MarkdownSelectionEdit | null {
	const { from, to } = range(start, end);
	const lineStart = source.lastIndexOf('\n', from - 1) + 1;
	const newline = source.indexOf('\n', to);
	const blockEnd = newline < 0 ? source.length : newline;
	const block = source.slice(lineStart, blockEnd);
	const lines = block.split('\n');
	const quoted = lines.length > 0 && lines.every((line) => line.startsWith('> '));
	const nextBlock = quoted
		? lines.map((line) => line.slice(2)).join('\n')
		: lines.map((line) => (line.startsWith('> ') ? line : `> ${line}`)).join('\n');
	return fit(
		source.slice(0, lineStart) + nextBlock + source.slice(blockEnd),
		lineStart,
		lineStart + nextBlock.length
	);
}
