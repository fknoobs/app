import * as curly from 'prettier-plugin-curly';
import { doc, util } from 'prettier';

const { hardline } = doc.builders;
const estreePrinter = curly.printers.estree;

function statementEnd(node) {
	return node.range?.[1] ?? node.end;
}

function alreadyHasBlankLineAfter(path, options) {
	const end = statementEnd(path.node);
	if (typeof end !== 'number' || typeof options.originalText !== 'string') {
		return false;
	}

	return util.isNextLineEmpty(options.originalText, end);
}

function shouldPadAfterIf(path, options) {
	return (
		path.node?.type === 'IfStatement' &&
		path.isInArray &&
		path.next != null &&
		!alreadyHasBlankLineAfter(path, options)
	);
}

export const parsers = curly.parsers;
export const printers = {
	estree: {
		...estreePrinter,
		print(path, options, print, args) {
			const printed = estreePrinter.print(path, options, print, args);
			if (shouldPadAfterIf(path, options)) {
				return [printed, hardline];
			}

			return printed;
		}
	}
};
