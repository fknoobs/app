export const controlBase =
	'border-secondary-800 bg-secondary-800/30 focus:border-secondary-600 h-11 rounded-md border focus:outline-none';

export const pageShell =
	'border-secondary-800 mx-auto flex min-h-screen max-w-6xl flex-col border-x';

export const interactive = 'cursor-pointer disabled:cursor-not-allowed';

export const headerCellAction =
	'h-auto rounded-none border-0 bg-primary/5 hover:border-0 hover:bg-primary/20';

export const tabTrigger =
	`${interactive} text-white rounded-md border border-transparent px-4 py-1.5 font-bold transition-colors duration-150 ` +
	'not-disabled:hover:bg-secondary-950/50 ' +
	'not-disabled:data-[state=active]:border-primary/20 not-disabled:data-[state=active]:bg-primary/5 not-disabled:data-[state=active]:text-primary ' +
	'disabled:text-secondary-500';

export const tableHeadRow =
	'bg-secondary-800/40 text-secondary-300 border-secondary-800 border-b text-xs font-semibold tracking-wide uppercase';

export const statWins = 'text-green-100 tabular-nums';
export const statLosses = 'text-red-100 tabular-nums';
export const statStreakPositive = 'text-green-300 tabular-nums';
export const statStreakNegative = 'text-red-300 tabular-nums';
export const statStreakNeutral = 'text-secondary-400 tabular-nums';

export function statStreakClass(streak: number): string {
	if (streak > 0) return statStreakPositive;
	if (streak < 0) return statStreakNegative;
	return statStreakNeutral;
}

export function formatStreak(streak: number): string {
	if (streak > 0) return `+${streak}`;
	return String(streak);
}
