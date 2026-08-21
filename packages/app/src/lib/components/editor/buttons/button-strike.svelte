<script>
	import { useEditor } from '../context.svelte';
	import Button from './button.svelte';
	import TextStrikethrough from 'phosphor-svelte/lib/TextStrikethroughIcon';

	const editor = useEditor();
</script>

<Button
	onclick={() => {
		editor.current?.chain().focus().toggleStrike().run();
	}}
	data-active={editor.current?.isActive('strike')}
>
	<TextStrikethrough />
</Button>
