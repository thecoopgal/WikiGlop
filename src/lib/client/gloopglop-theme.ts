import { browser } from '$app/environment';
import {
	GLOOPGLOP_BRAND,
	GLOOPGLOP_CUSTOM_COLOR_FIELDS,
	gloopglopColorVarName,
	type GloopglopCustomColorKey,
	type GloopglopCustomColors
} from '$lib/daisy-theme-colors';
import { cssColorToHex } from '$lib/client/color-format';
import {
	applyThemeToDocument,
	getThemePreference,
	resolveEffectiveTheme,
	setCustomThemeBase,
	setThemePreference,
	type EffectiveTheme
} from '$lib/client/theme-preference';

const STORAGE_KEY = 'gloopglop:daisy-theme-colors:v1';

const listeners = new Set<() => void>();

function emptyColors(): GloopglopCustomColors {
	return Object.fromEntries(
		GLOOPGLOP_CUSTOM_COLOR_FIELDS.map(({ key }) => [key, ''])
	) as GloopglopCustomColors;
}

function migrateStoredColors(parsed: Record<string, unknown>): Partial<GloopglopCustomColors> {
	const legacyText =
		typeof parsed['base-content'] === 'string' ? parsed['base-content'].trim() : '';
	if (legacyText) {
		if (!parsed['heading']) parsed['heading'] = legacyText;
		if (!parsed['subheading']) parsed['subheading'] = legacyText;
	}
	delete parsed['base-content'];
	delete parsed['base-300'];
	return parsed as Partial<GloopglopCustomColors>;
}

function readStoredColors(): Partial<GloopglopCustomColors> {
	if (!browser) return {};
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		if (!parsed || typeof parsed !== 'object') return {};
		return migrateStoredColors(parsed);
	} catch {
		return {};
	}
}

function defaultColorFromTheme(
	key: GloopglopCustomColorKey,
	computed: CSSStyleDeclaration
): string {
	if (key === 'heading' || key === 'subheading') {
		return cssColorToHex(computed.getPropertyValue('--color-base-content'));
	}
	if (key === 'button-text') {
		return GLOOPGLOP_BRAND.buttonText;
	}
	if (key === 'text-box-text') {
		return cssColorToHex(computed.getPropertyValue('--color-base-content'));
	}
	return cssColorToHex(computed.getPropertyValue(gloopglopColorVarName(key)));
}

function writeStoredColors(colors: Partial<GloopglopCustomColors>) {
	if (!browser) return;
	const allowed = new Set<GloopglopCustomColorKey>(
		GLOOPGLOP_CUSTOM_COLOR_FIELDS.map(({ key }) => key)
	);
	const cleaned = Object.fromEntries(
		Object.entries(colors).filter(
			([key, value]) =>
				allowed.has(key as GloopglopCustomColorKey) &&
				typeof value === 'string' &&
				value.trim()
		)
	);
	if (Object.keys(cleaned).length === 0) {
		localStorage.removeItem(STORAGE_KEY);
		return;
	}
	localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
}

function notify() {
	for (const listener of listeners) listener();
}

export function subscribeGloopglopTheme(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function readDaisyThemeDefaults(
	themeName: EffectiveTheme = resolveEffectiveTheme(getThemePreference())
): GloopglopCustomColors {
	if (!browser) return emptyColors();

	const probe = document.createElement('div');
	probe.setAttribute('data-theme', themeName);
	probe.style.position = 'absolute';
	probe.style.visibility = 'hidden';
	probe.style.pointerEvents = 'none';
	document.body.appendChild(probe);

	const computed = getComputedStyle(probe);
	const defaults = emptyColors();
	for (const { key } of GLOOPGLOP_CUSTOM_COLOR_FIELDS) {
		defaults[key] = defaultColorFromTheme(key, computed);
	}

	document.body.removeChild(probe);
	return defaults;
}

export function hasCustomThemePreset(): boolean {
	const saved = readStoredColors();
	return GLOOPGLOP_CUSTOM_COLOR_FIELDS.some(({ key }) => saved[key]?.trim());
}

export function getActiveGloopglopThemeColors(): GloopglopCustomColors {
	const preference = getThemePreference();
	const defaults = readDaisyThemeDefaults(resolveEffectiveTheme(preference));
	if (preference !== 'custom') return defaults;
	const saved = readStoredColors();
	return { ...defaults, ...saved };
}

export function setGloopglopThemeColor(key: GloopglopCustomColorKey, value: string) {
	const preference = getThemePreference();
	if (preference !== 'custom') {
		setCustomThemeBase(resolveEffectiveTheme(preference));
		setThemePreference('custom');
	}
	const saved = readStoredColors();
	saved[key] = value;
	writeStoredColors(saved);
	applyGloopglopTheme(true);
	notify();
}

export function resetGloopglopThemeColors() {
	if (browser) localStorage.removeItem(STORAGE_KEY);
	clearGloopglopThemeColorVars();
	applyGloopglopTheme(true);
	notify();
}

export function clearGloopglopThemeColorVars() {
	if (!browser) return;
	const root = document.documentElement;
	for (const { key } of GLOOPGLOP_CUSTOM_COLOR_FIELDS) {
		root.style.removeProperty(gloopglopColorVarName(key));
	}
}

function applyGloopglopBrandPrimary() {
	if (!browser) return;
	const root = document.documentElement;
	root.style.setProperty('--color-primary', GLOOPGLOP_BRAND.primary);
	root.style.setProperty('--color-primary-content', GLOOPGLOP_BRAND.primaryContent);
}

function clearGloopglopBrandPrimary() {
	if (!browser) return;
	const root = document.documentElement;
	root.style.removeProperty('--color-primary');
	root.style.removeProperty('--color-primary-content');
}

export function applyGloopglopTheme(active: boolean) {
	if (!browser) return;

	if (!active) {
		document.documentElement.removeAttribute('data-theme');
		clearGloopglopThemeColorVars();
		clearGloopglopBrandPrimary();
		return;
	}

	applyThemeToDocument();
	applyGloopglopBrandPrimary();

	const preference = getThemePreference();
	const saved = readStoredColors();
	for (const { key } of GLOOPGLOP_CUSTOM_COLOR_FIELDS) {
		const varName = gloopglopColorVarName(key);
		if (preference === 'custom') {
			const value = saved[key]?.trim();
			if (value) document.documentElement.style.setProperty(varName, value);
			else document.documentElement.style.removeProperty(varName);
		} else {
			document.documentElement.style.removeProperty(varName);
		}
	}
}
