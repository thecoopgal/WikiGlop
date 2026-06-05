import { browser } from '$app/environment';
import {
	GLOOPGLOP_CUSTOM_COLOR_FIELDS,
	gloopglopColorVarName,
	type GloopglopCustomColorKey,
	type GloopglopCustomColors
} from '$lib/daisy-theme-colors';
import { readDaisyThemeDefaults } from '$lib/client/gloopglop-theme';
import { normalizeHexColor } from '$lib/client/color-format';

const CREATOR_PAGE_COLORS_KEY = 'wikiglop.links.create.creator_page_colors';

function emptyCreatorPageColors(): GloopglopCustomColors {
	return Object.fromEntries(
		GLOOPGLOP_CUSTOM_COLOR_FIELDS.map(({ key }) => [key, ''])
	) as GloopglopCustomColors;
}

export function defaultLinksCreateCreatorPageColors(): GloopglopCustomColors {
	if (!browser) return emptyCreatorPageColors();
	return readDaisyThemeDefaults();
}

export function getLinksCreateCreatorPageColors(): GloopglopCustomColors {
	if (!browser) return emptyCreatorPageColors();
	const raw = sessionStorage.getItem(CREATOR_PAGE_COLORS_KEY);
	if (!raw) return defaultLinksCreateCreatorPageColors();
	try {
		const parsed = JSON.parse(raw) as Partial<GloopglopCustomColors>;
		if (!parsed || typeof parsed !== 'object') return defaultLinksCreateCreatorPageColors();
		const defaults = defaultLinksCreateCreatorPageColors();
		const allowed = new Set<GloopglopCustomColorKey>(
			GLOOPGLOP_CUSTOM_COLOR_FIELDS.map(({ key }) => key)
		);
		for (const [key, value] of Object.entries(parsed)) {
			if (!allowed.has(key as GloopglopCustomColorKey)) continue;
			if (typeof value !== 'string' || !value.trim()) continue;
			defaults[key as GloopglopCustomColorKey] = value.trim();
		}
		return defaults;
	} catch {
		return defaultLinksCreateCreatorPageColors();
	}
}

export function setLinksCreateCreatorPageColors(colors: GloopglopCustomColors): void {
	if (!browser) return;
	sessionStorage.setItem(CREATOR_PAGE_COLORS_KEY, JSON.stringify(colors));
}

export function clearLinksCreateCreatorPageColors(): void {
	if (!browser) return;
	sessionStorage.removeItem(CREATOR_PAGE_COLORS_KEY);
}

/** Full-page shell background — matches site.yaml `theme.overrides.base-200`. */
export function creatorPageBackgroundStyle(colors: GloopglopCustomColors): string {
	const value = colors['base-200']?.trim();
	if (!value) return '';
	return `${gloopglopColorVarName('base-200')}: ${value}; background-color: ${value}`;
}

export function creatorPageColorsToStyle(colors: GloopglopCustomColors): string {
	return colorVarsToStyle(colors, GLOOPGLOP_CUSTOM_COLOR_FIELDS.map(({ key }) => key));
}

/** Card-scoped vars only — page background (`base-200`) applies on the shell. */
export function creatorCardPreviewStyle(colors: GloopglopCustomColors): string {
	return colorVarsToStyle(
		colors,
		GLOOPGLOP_CUSTOM_COLOR_FIELDS.map(({ key }) => key).filter((key) => key !== 'base-200')
	);
}

function colorVarsToStyle(
	colors: GloopglopCustomColors,
	keys: readonly GloopglopCustomColorKey[]
): string {
	return keys
		.map((key) => {
			const value = colors[key]?.trim();
			if (!value) return '';
			return `${gloopglopColorVarName(key)}: ${value}`;
		})
		.filter(Boolean)
		.join('; ');
}

export function normalizeCreatorPageColor(value: string): string | null {
	return normalizeHexColor(value);
}
