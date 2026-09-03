import type { Snippet } from 'svelte';
import type { HTMLInputAttributes, HTMLTextareaAttributes } from 'svelte/elements';
import Input from './input.svelte';
import Checkbox from './checkbox.svelte';
import RadioGroup from './radio-group.svelte';
import Selection from './selection.svelte';
import Slider from './slider.svelte';
import Textarea from './textarea.svelte';

export type InputProps = HTMLInputAttributes & {
	flush?: boolean;
	decreaseLabel?: string;
	increaseLabel?: string;
	leading?: Snippet;
	trailing?: Snippet;
};

export type TextareaProps = HTMLTextareaAttributes & {
	flush?: boolean;
};

export { Input, Checkbox, RadioGroup, Selection, Slider, Textarea };
