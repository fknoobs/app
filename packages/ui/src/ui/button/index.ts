import type { Snippet } from 'svelte';
import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
import Button from './button.svelte';

export type ButtonProps = {
	variant?: 'primary' | 'secondary' | 'ghost' | 'link' | 'destructive' | 'success' | 'warning';
	size?: 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';
	children: Snippet;
	loading?: boolean;
	href?: string;
	download?: HTMLAnchorAttributes['download'];
	target?: HTMLAnchorAttributes['target'];
	rel?: HTMLAnchorAttributes['rel'];
} & HTMLButtonAttributes;

export { Button };
