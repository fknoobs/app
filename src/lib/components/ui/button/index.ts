import type { Snippet } from 'svelte';
import type { HTMLButtonAttributes } from 'svelte/elements';
import Button from './button.svelte';

export type ButtonProps = {
	variant?: 'primary' | 'secondary' | 'ghost';
	children: Snippet;
	loading?: boolean;
} & HTMLButtonAttributes;

export { Button };
