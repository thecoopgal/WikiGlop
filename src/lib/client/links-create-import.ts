import { browser } from '$app/environment';
import { readDaisyThemeDefaults } from '$lib/client/gloopglop-theme';
import { setLinksCreateCreatorPageColors } from '$lib/client/links-create-page-colors';
import {
	setLinksCreateCreatorLinks,
	setLinksCreateCreatorNames,
	setLinksCreateCreatorPageDescription,
	setLinksCreateCreatorProfilePicture,
	setLinksCreateCreatorShareIconVariant,
	setLinksCreateCreatorTagline,
	setLinksCreateProfileTheme
} from '$lib/client/links-create-state';
import {
	pageColorsFromThemeOverrides,
	type LinksCreateImportedPage,
	type LinksCreateSiteThemeMode
} from '$lib/links-create-import';
import type { EffectiveTheme } from '$lib/client/theme-preference';

const CREATOR_IMPORTED_THEME_MODE_KEY = 'wikiglop.links.create.imported_site_theme_mode';

export type LinksCreateImportResult =
	| { ok: true; page: LinksCreateImportedPage }
	| { ok: false; error: string };

export function getLinksCreateImportedSiteThemeMode(): EffectiveTheme | null {
	if (!browser) return null;
	const raw = sessionStorage.getItem(CREATOR_IMPORTED_THEME_MODE_KEY);
	return raw === 'light' || raw === 'dark' ? raw : null;
}

export function setLinksCreateImportedSiteThemeMode(mode: LinksCreateSiteThemeMode | null): void {
	if (!browser) return;
	if (!mode) {
		sessionStorage.removeItem(CREATOR_IMPORTED_THEME_MODE_KEY);
		return;
	}
	sessionStorage.setItem(CREATOR_IMPORTED_THEME_MODE_KEY, mode);
}

export function applyLinksCreateImportedPage(page: LinksCreateImportedPage): void {
	if (!browser) return;

	setLinksCreateProfileTheme(page.theme);
	setLinksCreateCreatorNames(page.names);
	setLinksCreateCreatorTagline(page.tagline);
	setLinksCreateCreatorPageDescription(page.description);
	setLinksCreateCreatorLinks(page.links);
	setLinksCreateCreatorProfilePicture(page.profilePicture);

	const defaults = readDaisyThemeDefaults(page.siteThemeMode);
	const mergedColors = pageColorsFromThemeOverrides(page.colorOverrides, defaults);
	setLinksCreateCreatorPageColors(mergedColors);
	setLinksCreateCreatorShareIconVariant(page.shareIconVariant);
	setLinksCreateImportedSiteThemeMode(page.siteThemeMode);
}

export async function importLinksCreatePage(url: string): Promise<LinksCreateImportResult> {
	const res = await fetch('/api/links-create/import', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ url })
	});

	let data: { ok?: boolean; error?: string; page?: LinksCreateImportedPage } = {};
	try {
		data = (await res.json()) as typeof data;
	} catch {
		/* empty */
	}

	if (!res.ok || !data.ok || !data.page) {
		return {
			ok: false,
			error: typeof data.error === 'string' ? data.error : res.statusText || 'Request failed'
		};
	}

	applyLinksCreateImportedPage(data.page);
	return { ok: true, page: data.page };
}
