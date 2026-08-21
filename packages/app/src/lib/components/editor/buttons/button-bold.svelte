<script>
	import { useEditor } from '../context.svelte';
	import Button from './button.svelte';
	import TextBold from 'phosphor-svelte/lib/TextBIcon';

	const editor = useEditor();
</script>

<Button
	onclick={() => {
		editor.current?.chain().focus().toggleBold().run();
	}}
	data-active={editor.current?.isActive('bold')}
>
	<TextBold />
</Button>
