import { inferCreatorLinkIconModeFromShortLink } from '$lib/creator-link-icon';
import type { GloopglopCustomColorKey } from '$lib/daisy-theme-colors';
import { GLOOPGLOP_CUSTOM_COLOR_FIELDS } from '$lib/daisy-theme-colors';
import {
	type LinksCreateImportedPage,
	type LinksCreateSiteThemeMode
} from '$lib/links-create-import';
import { isCreatorLinksThemeId } from '$lib/links-creator-themes';
import type { CreatorShareIconVariant } from '$lib/links-create-context';
import { loadPageYaml, type PageYaml } from '$lib/server/content';
import {
	resolveSiteByHostname,
	resolveSiteForGloopGgPath,
	type ResolvedSite
} from '$lib/server/sites';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function parsePageUrl(input: string): URL | null {
	const trimmed = input.trim();
	if (!trimmed) return null;
	try {
		return new URL(trimmed);
	} catch {
		try {
			return new URL(`https://${trimmed}`);
		} catch {
			return null;
		}
	}
}

async function resolveSiteFromUrl(url: URL): Promise<ResolvedSite | null> {
	const host = url.hostname.toLowerCase();

	if (host === 'gloop.gg' || host === 'www.gloop.gg') {
		const siteKey = url.pathname.split('/').filter(Boolean)[0];
		if (!siteKey) return null;
		return resolveSiteForGloopGgPath(siteKey);
	}

	if (host.endsWith('.gloop.gg') && host !== 'gloop.gg' && host !== 'www.gloop.gg') {
		let label = host.slice(0, -'.gloop.gg'.length);
		if (label.startsWith('www.')) label = label.slice(4);
		if (!label) return null;
		return resolveSiteForGloopGgPath(label);
	}

	return resolveSiteByHostname(host);
}

function slugPartsFromUrl(url: URL): string[] {
	const host = url.hostname.toLowerCase();

	if (host === 'gloop.gg' || host === 'www.gloop.gg') {
		const segments = url.pathname.split('/').filter(Boolean);
		if (segments.length <= 1) return [];
		return segments.slice(1);
	}

	const path = url.pathname.replace(/\/+$/, '') || '/';
	if (path === '/') return [];
	return path.split('/').filter(Boolean);
}

function siteThemeMode(site: ResolvedSite): LinksCreateSiteThemeMode {
	const preset = site.theme?.preset?.trim().toLowerCase();
	const mode = site.theme?.mode?.trim().toLowerCase();
	if (preset === 'light' || preset === 'dark') return preset;
	if (mode === 'light' || mode === 'dark') return mode;
	return 'light';
}

function colorOverridesFromSite(site: ResolvedSite): Partial<LinksCreateImportedPage['colorOverrides']> {
	const overrides = site.theme?.overrides;
	if (!overrides || typeof overrides !== 'object') return {};

	const allowed = new Set<GloopglopCustomColorKey>(
		GLOOPGLOP_CUSTOM_COLOR_FIELDS.map(({ key }) => key)
	);
	const out: Partial<LinksCreateImportedPage['colorOverrides']> = {};
	for (const [key, value] of Object.entries(overrides)) {
		if (!allowed.has(key as GloopglopCustomColorKey)) continue;
		if (typeof value !== 'string' || !value.trim()) continue;
		out[key as GloopglopCustomColorKey] = value.trim();
	}
	return out;
}

function extractCreatorProfileBlock(page: PageYaml): Record<string, unknown> | null {
	const block = page.blocks?.find((item) => item.type === 'creator_profile');
	return block && isRecord(block) ? block : null;
}

function importedNames(profile: Record<string, unknown>): string[] {
	if (Array.isArray(profile.names)) {
		return profile.names
			.filter((value): value is string => typeof value === 'string')
			.map((value) => value.trim())
			.filter((value) => value.length >= 2);
	}
	if (typeof profile.name === 'string' && profile.name.trim().length >= 2) {
		return [profile.name.trim()];
	}
	return [];
}

function importedLinks(profile: Record<string, unknown>): LinksCreateImportedPage['links'] {
	if (!Array.isArray(profile.short_links)) return [];
	const links: LinksCreateImportedPage['links'] = [];
	for (const item of profile.short_links) {
		if (!isRecord(item) || typeof item.href !== 'string') continue;
		const href = item.href.trim();
		if (!href) continue;
		const label = typeof item.label === 'string' ? item.label.trim() : '';
		links.push({
			label,
			href,
			iconMode: inferCreatorLinkIconModeFromShortLink({
				href,
				icon_mode: item.icon_mode,
				seo_image: typeof item.seo_image === 'string' ? item.seo_image : undefined,
				seo_icon: typeof item.seo_icon === 'string' ? item.seo_icon : undefined,
				logo_override: typeof item.logo_override === 'string' ? item.logo_override : undefined
			})
		});
	}
	return links;
}

function importedShareIconVariant(
	profile: Record<string, unknown>,
	effectiveSiteTheme: LinksCreateSiteThemeMode
): CreatorShareIconVariant {
	if (profile.share_icon_variant === 'dark' || profile.share_icon_variant === 'light') {
		return profile.share_icon_variant;
	}
	return effectiveSiteTheme === 'dark' ? 'dark' : 'light';
}

export async function importLinksCreatePageFromUrl(
	inputUrl: string
): Promise<{ ok: true; page: LinksCreateImportedPage } | { ok: false; error: string }> {
	const url = parsePageUrl(inputUrl);
	if (!url) {
		return { ok: false, error: 'Enter a valid page link (for example thecoopgal.gloopglop.com).' };
	}

	const site = await resolveSiteFromUrl(url);
	if (!site) {
		return { ok: false, error: 'No GloopGlop creator site found for that link.' };
	}

	const slugParts = slugPartsFromUrl(url);
	const page = await loadPageYaml(site, slugParts);
	if (!page) {
		return { ok: false, error: 'No page found at that link.' };
	}

	const profile = extractCreatorProfileBlock(page);
	if (!profile) {
		return { ok: false, error: 'That page does not have a creator profile to edit.' };
	}

	const names = importedNames(profile);
	if (names.length === 0) {
		return { ok: false, error: 'That creator profile is missing a usable name.' };
	}

	const profileThemeRaw =
		typeof profile.profile_theme === 'string' ? profile.profile_theme.trim() : 'gloopglop';
	const theme = isCreatorLinksThemeId(profileThemeRaw) ? profileThemeRaw : 'gloopglop';
	const resolvedSiteThemeMode = siteThemeMode(site);

	const tagline = typeof profile.tagline === 'string' ? profile.tagline.trim() : '';
	const description = typeof profile.bio === 'string' ? profile.bio.trim() : '';
	const avatar = typeof profile.avatar === 'string' ? profile.avatar.trim() : '';

	return {
		ok: true,
		page: {
			theme,
			siteThemeMode: resolvedSiteThemeMode,
			names,
			tagline,
			description,
			links: importedLinks(profile),
			profilePicture: avatar,
			colorOverrides: colorOverridesFromSite(site),
			shareIconVariant: importedShareIconVariant(profile, resolvedSiteThemeMode),
			sourceUrl: url.href,
			siteId: site.siteId
		}
	};
}
