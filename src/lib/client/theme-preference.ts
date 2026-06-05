import { browser } from '$app/environment';

export type ThemePreference = 'light' | 'dark' | 'system' | 'custom';
export type EffectiveTheme = 'light' | 'dark';

const STORAGE_KEY = 'gloopglop:theme-preference:v1';
const CUSTOM_BASE_KEY = 'gloopglop:custom-theme-base:v1';

export const THEME_OPTIONS: Array<{ id: ThemePreference; label: string; description: string }> = [
	{ id: 'light', label: 'Light', description: 'Bright and clear' },
	{ id: 'dark', label: 'Dark', description: 'Easy on the eyes' },
	{ id: 'system', label: 'System', description: 'Match your device' },
	{ id: 'custom', label: 'Custom', description: 'Your last custom colors' }
];

function readStored(): ThemePreference {
	if (!browser) return 'system';
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === 'light' || stored === 'dark' || stored === 'system' || stored === 'custom') {
		return stored;
	}
	return 'system';
}

function readSystemTheme(): EffectiveTheme {
	if (!browser) return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getCustomThemeBase(): EffectiveTheme {
	if (!browser) return 'light';
	const stored = localStorage.getItem(CUSTOM_BASE_KEY);
	if (stored === 'light' || stored === 'dark') return stored;
	return readSystemTheme();
}

export function setCustomThemeBase(base: EffectiveTheme): void {
	if (!browser) return;
	localStorage.setItem(CUSTOM_BASE_KEY, base);
}

export function resolveEffectiveTheme(preference: ThemePreference): EffectiveTheme {
	if (preference === 'system') return readSystemTheme();
	if (preference === 'custom') return getCustomThemeBase();
	return preference;
}

let preference = readStored();
const listeners = new Set<(pref: ThemePreference) => void>();

export function getThemePreference(): ThemePreference {
	return preference;
}

export function setThemePreference(next: ThemePreference): void {
	preference = next;
	if (browser) {
		localStorage.setItem(STORAGE_KEY, next);
		applyThemeToDocument(next);
	}
	for (const listener of listeners) listener(preference);
}

export function subscribeThemePreference(listener: (pref: ThemePreference) => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function applyThemeToDocument(pref: ThemePreference = preference): void {
	if (!browser) return;
	document.documentElement.setAttribute('data-theme', resolveEffectiveTheme(pref));
}

export function initThemePreference(): () => void {
	if (!browser) return () => {};
	const mq = window.matchMedia('(prefers-color-scheme: dark)');
	const onChange = () => {
		if (preference === 'system') applyThemeToDocument();
	};
	mq.addEventListener('change', onChange);
	return () => mq.removeEventListener('change', onChange);
}
