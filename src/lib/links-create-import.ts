import type { GloopglopCustomColorKey, GloopglopCustomColors } from '$lib/daisy-theme-colors';
import { GLOOPGLOP_CUSTOM_COLOR_FIELDS } from '$lib/daisy-theme-colors';
import type { CreatorLinkIconMode, CreatorShareIconVariant } from '$lib/links-create-context';
import type { CreatorLinksThemeId } from '$lib/links-creator-themes';

export type LinksCreateImportedLink = {
	label: string;
	href: string;
	iconMode?: CreatorLinkIconMode;
};

export type LinksCreateSiteThemeMode = 'light' | 'dark';

export type LinksCreateImportedPage = {
	theme: CreatorLinksThemeId;
	siteThemeMode: LinksCreateSiteThemeMode;
	names: string[];
	tagline: string;
	description: string;
	links: LinksCreateImportedLink[];
	profilePicture: string;
	/** Only values explicitly set in site.yaml `theme.overrides`. */
	colorOverrides: Partial<GloopglopCustomColors>;
	shareIconVariant: CreatorShareIconVariant;
	sourceUrl: string;
	siteId: string;
};

export function pageColorsFromThemeOverrides(
	overrides: Record<string, string> | undefined,
	defaults: GloopglopCustomColors
): GloopglopCustomColors {
	if (!overrides) return { ...defaults };
	const allowed = new Set<GloopglopCustomColorKey>(
		GLOOPGLOP_CUSTOM_COLOR_FIELDS.map(({ key }) => key)
	);
	const merged = { ...defaults };
	for (const [key, value] of Object.entries(overrides)) {
		if (!allowed.has(key as GloopglopCustomColorKey)) continue;
		if (typeof value !== 'string' || !value.trim()) continue;
		merged[key as GloopglopCustomColorKey] = value.trim();
	}
	return merged;
}
