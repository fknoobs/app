import type { HTMLAnchorAttributes, HTMLAttributes } from 'svelte/elements';
import type { Snippet } from 'svelte';
import Link from './link.svelte';
import Nav from './nav.svelte';

export type LinkProps = {
	children: Snippet;
} & HTMLAnchorAttributes;

export type NavProps = {
	children: Snippet;
} & HTMLAttributes<HTMLElement>;

export { Nav as Root, Link };
