import type { HTMLInputAttributes } from 'svelte/elements';
import Input from './input.svelte';
import Checkbox from './checkbox.svelte';
import RadioGroup from './radio-group.svelte';

export type InputProps = {} & HTMLInputAttributes;

export { Input, Checkbox, RadioGroup };
