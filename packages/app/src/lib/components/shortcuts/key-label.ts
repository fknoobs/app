const KEY_LABELS: Record<string, string> = {
	CommandOrControl: 'Ctrl',
	CmdOrControl: 'Ctrl',
	Control: 'Ctrl',
	Ctrl: 'Ctrl',
	Cmd: 'Cmd',
	Command: 'Cmd',
	Shift: 'Shift',
	Alt: 'Alt',
	Super: 'Win',
	Meta: 'Meta',
	Space: 'Space',
	Enter: 'Enter',
	Backspace: 'Backspace',
	Tab: 'Tab',
	Escape: 'Esc',
	Delete: 'Del',
	ArrowUp: '↑',
	ArrowDown: '↓',
	ArrowLeft: '←',
	ArrowRight: '→'
};

export function formatKeyLabel(key: string): string {
	if (KEY_LABELS[key]) {
		return KEY_LABELS[key];
	}

	if (key.startsWith('Key') && key.length === 4) {
		return key.slice(3);
	}

	if (key.startsWith('Digit') && key.length === 6) {
		return key.slice(5);
	}

	if (key.startsWith('Numpad')) {
		return key.slice(6);
	}

	return key;
}
