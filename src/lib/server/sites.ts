import { parse as parseYaml } from 'yaml';

export type SiteTheme = {
	preset?: string;
	mode?: 'light' | 'dark' | string;
	overrides?: Record<string, string>;
};

export type SiteNavLink = {
	label: string;
	href: string;
	open_mode?: 'modal' | string;
	modal?: string;
};

/** Default creator_profile short links for all pages on this site. */
export type SiteShortLink = {
	label?: string;
	href: string;
	icon?: string;
	seo_image?: string;
	seo_icon?: string;
	logo_override?: string;
	open_in?: string;
	open_mode?: string;
};

export type SiteShortLinkGroup = {
	heading: string;
	links: SiteShortLink[];
};

export type SiteNavigation = {
	header?: SiteNavLink[];
};

export type SiteConfig = {
	id: string;
	name?: string;
	hosts?: string[];
	kind?: string;
	theme?: SiteTheme;
	navigation?: SiteNavigation;
	short_links?: SiteShortLink[];
	short_link_groups?: SiteShortLinkGroup[];
	routing?: {
		default_page?: string;
		/** First path segment on gloop.gg / www.gloop.gg (e.g. `taf` → this site). */
		gloop_gg_short_slug?: string;
	};
	permissions?: Record<string, unknown>;
};

export type ResolvedSite = SiteConfig & {
	siteId: string; // directory name under /content/sites
	/** Published row in D1 `content_sites` (self-serve). Members live in `content_site_members`. */
	contentStore?: {
		source: string | null;
		sourceRef: string | null;
	};
	/** Approved links submission when the site is not in content/sites or D1. */
	linksSubmission?: {
		id: string;
		payload: import('$lib/links-submission-payload').LinksPageSubmissionPayload;
	};
};

type CachedSites = {
	loadedAtMs: number;
	sites: ResolvedSite[];
};

let cache: CachedSites | null = null;

const SITE_YAML_FILES = import.meta.glob('/content/sites/*/site.yaml', {
	eager: true,
	query: '?raw',
	import: 'default'
}) as Record<string, string>;

function isNonEmptyString(v: unknown): v is string {
	return typeof v === 'string' && v.trim().length > 0;
}

function normalizeHostname(hostname: string) {
	// URL hostname is already lowercased in most cases, but normalize anyway.
	return hostname.trim().toLowerCase().replace(/\.+$/, '');
}

function pickSubdomainCandidate(hostname: string): string | null {
	const parts = hostname.split('.').filter(Boolean);
	// Need at least subdomain + domain (e.g. thepaperjelly.localhost, foo.example.com).
	if (parts.length < 2) return null;
	const first = parts[0];
	if (!first || first === 'www') return null;
	return first;
}

function safeStringArray(v: unknown): string[] | undefined {
	if (!Array.isArray(v)) return undefined;
	const out = v.filter((x) => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim());
	return out.length ? out : undefined;
}

function parseSiteShortLinkItem(x: Record<string, unknown>): SiteShortLink | null {
	if (typeof x.href !== 'string' || !x.href.trim()) return null;
	return {
		label: typeof x.label === 'string' ? x.label : undefined,
		href: String(x.href),
		icon: typeof x.icon === 'string' ? x.icon : undefined,
		seo_image: typeof x.seo_image === 'string' ? x.seo_image : undefined,
		seo_icon: typeof x.seo_icon === 'string' ? x.seo_icon : undefined,
		logo_override: typeof x.logo_override === 'string' ? x.logo_override : undefined,
		open_in: typeof x.open_in === 'string' ? x.open_in : undefined,
		open_mode: typeof x.open_mode === 'string' ? x.open_mode : undefined
	};
}

function parseSiteShortLinks(raw: unknown): SiteShortLink[] | undefined {
	if (!Array.isArray(raw)) return undefined;
	const out = raw
		.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
		.map((x) => parseSiteShortLinkItem(x))
		.filter((x): x is SiteShortLink => x !== null);
	return out.length ? out : undefined;
}

function parseSiteShortLinkGroups(raw: unknown): SiteShortLinkGroup[] | undefined {
	if (!Array.isArray(raw)) return undefined;
	const out: SiteShortLinkGroup[] = [];
	for (const item of raw) {
		if (!item || typeof item !== 'object') continue;
		const obj = item as Record<string, unknown>;
		const heading = typeof obj.heading === 'string' ? obj.heading.trim() : '';
		const links = parseSiteShortLinks(obj.links);
		if (!heading || !links?.length) continue;
		out.push({ heading, links });
	}
	return out.length ? out : undefined;
}

export function normalizeTheme(themeRaw: unknown): SiteTheme | undefined {
	if (!themeRaw || typeof themeRaw !== 'object') return undefined;
	const theme = themeRaw as SiteTheme;
	const preset = typeof theme.preset === 'string' ? theme.preset.trim().toLowerCase() : '';
	const mode = typeof theme.mode === 'string' ? theme.mode.trim().toLowerCase() : '';
	const overrides = theme.overrides && typeof theme.overrides === 'object' ? { ...theme.overrides } : undefined;

	// Preset defaults: keep explicit site overrides, but supply a consistent baseline.
	const effectiveTheme = preset === 'light' || preset === 'dark' ? preset : mode;
	if (preset === 'gloopglop' && effectiveTheme !== 'dark') {
		return {
			...theme,
			overrides: {
				'base-200': '#F4F7FA',
				...(overrides ?? {})
			}
		};
	}

	return {
		...theme,
		overrides
	};
}

async function loadSiteConfig(siteId: string): Promise<ResolvedSite | null> {
	const filePath = `/content/sites/${siteId}/site.yaml`;
	const raw = SITE_YAML_FILES[filePath];
	if (typeof raw !== 'string') return null;

	// Treat empty files as non-configured sites.
	if (!raw.trim()) return null;

	let parsed: unknown;
	try {
		parsed = parseYaml(raw);
	} catch {
		// Invalid YAML -> skip site instead of crashing hostname resolution.
		return null;
	}

	if (!parsed || typeof parsed !== 'object') return null;
	const obj = parsed as Record<string, unknown>;

	const id = obj.id;
	const hosts = safeStringArray(obj.hosts);
	if (!isNonEmptyString(id) || !hosts) return null;

	return {
		siteId,
		id,
		name: typeof obj.name === 'string' ? obj.name : undefined,
		kind: typeof obj.kind === 'string' ? obj.kind : undefined,
		hosts,
		theme: normalizeTheme(obj.theme),
		navigation: (() => {
			if (!obj.navigation || typeof obj.navigation !== 'object') return undefined;
			const navObj = obj.navigation as Record<string, unknown>;
			const headerRaw = navObj.header;
			const header =
				Array.isArray(headerRaw)
					? headerRaw
							.filter(
								(x): x is Record<string, unknown> =>
									typeof x === 'object' &&
									x !== null &&
									typeof (x as Record<string, unknown>).label === 'string' &&
									typeof (x as Record<string, unknown>).href === 'string'
							)
							.map((x) => ({
								label: String(x.label),
								href: String(x.href),
								open_mode:
									typeof x.open_mode === 'string' ? (x.open_mode as SiteNavLink['open_mode']) : undefined,
								modal: typeof x.modal === 'string' ? x.modal : undefined
							}))
					: undefined;

			const navigation: SiteNavigation = {};
			if (header) navigation.header = header;
			return Object.keys(navigation).length ? navigation : undefined;
		})(),
		routing: obj.routing && typeof obj.routing === 'object' ? (obj.routing as any) : undefined,
		short_links: parseSiteShortLinks(obj.short_links),
		short_link_groups: parseSiteShortLinkGroups(obj.short_link_groups),
		permissions:
			obj.permissions && typeof obj.permissions === 'object'
				? (obj.permissions as Record<string, unknown>)
				: undefined
	};
}

async function loadAllSites(): Promise<ResolvedSite[]> {
	const siteIds = Object.keys(SITE_YAML_FILES)
		.map((filePath) => {
			const match = /\/content\/sites\/([^/]+)\/site\.yaml$/i.exec(filePath);
			return match?.[1] ?? null;
		})
		.filter((siteId): siteId is string => typeof siteId === 'string');

	const sites: ResolvedSite[] = [];
	for (const siteId of siteIds) {
		// eslint-disable-next-line no-await-in-loop
		const site = await loadSiteConfig(siteId);
		if (site) sites.push(site);
	}

	return sites;
}

export async function getAllSites(): Promise<ResolvedSite[]> {
	const CACHE_MS = 10_000;
	const now = Date.now();
	if (cache && now - cache.loadedAtMs < CACHE_MS) return cache.sites;

	const sites = await loadAllSites();
	cache = { loadedAtMs: now, sites };
	return sites;
}

export async function resolveSiteById(
	siteId: string,
	platform?: App.Platform
): Promise<ResolvedSite | null> {
	const key = normalizeHostname(siteId);
	if (!key) return null;

	// D1 published sites win over YAML for the same id (self-serve edits).
	const { getContentSiteById } = await import('$lib/server/content-store');
	const fromDb = await getContentSiteById(platform, key);
	if (fromDb) return fromDb;

	const sites = await getAllSites();
	const staticSite =
		sites.find(
			(s) => normalizeHostname(s.siteId) === key || normalizeHostname(s.id) === key
		) ?? null;
	if (staticSite) return staticSite;

	const { resolveApprovedLinksSubmissionSite } = await import('$lib/server/links-submission-sites');
	return resolveApprovedLinksSubmissionSite(platform, key);
}

/** Resolves `gloop.gg/{firstSegment}/...` to a site by id or by `routing.gloop_gg_short_slug`. */
export async function resolveSiteForGloopGgPath(
	firstSegment: string,
	platform?: App.Platform
): Promise<ResolvedSite | null> {
	const key = normalizeHostname(firstSegment);
	if (!key) return null;

	const byId = await resolveSiteById(key, platform);
	if (byId) return byId;

	const sites = await getAllSites();
	for (const site of sites) {
		const short = site.routing?.gloop_gg_short_slug;
		if (typeof short === 'string' && normalizeHostname(short) === key) {
			return site;
		}
	}

	return null;
}

export async function resolveSiteByHostname(
	hostname: string,
	platform?: App.Platform
): Promise<ResolvedSite | null> {
	const hostnameNormalized = normalizeHostname(hostname);
	const sites = await getAllSites();
	const candidate = pickSubdomainCandidate(hostnameNormalized);

	const isLoopback =
		hostnameNormalized === 'localhost' ||
		hostnameNormalized === '127.0.0.1' ||
		hostnameNormalized === '::1';

	// 1) D1 published sites by host (self-serve). Skip bare loopback — platform YAML owns that.
	if (!isLoopback) {
		const { getContentSiteByHostname } = await import('$lib/server/content-store');
		const fromDbHost = await getContentSiteByHostname(platform, hostnameNormalized);
		if (fromDbHost) return fromDbHost;
	}

	// 2) Exact host allow-list match from site.yaml.
	const exactMatches = sites.filter(
		(site) => site.hosts && site.hosts.some((h) => normalizeHostname(h) === hostnameNormalized)
	);
	if (exactMatches.length === 1) return exactMatches[0];
	if (exactMatches.length > 1) {
		// If multiple sites claim the same host, prefer the one whose id/folder matches
		// the subdomain (e.g. thepaperjelly.localhost -> siteId/id "thepaperjelly").
		if (candidate) {
			const byCandidate = exactMatches.find(
				(site) =>
					normalizeHostname(site.siteId) === candidate || normalizeHostname(site.id) === candidate
			);
			if (byCandidate) return byCandidate;
		}
		// Bare loopback — prefer the platform site so /login and tools resolve correctly.
		if (isLoopback) {
			const platformSite = exactMatches.find(
				(site) =>
					normalizeHostname(site.siteId) === 'gloopglop' || normalizeHostname(site.id) === 'gloopglop'
			);
			if (platformSite) return platformSite;
		}
		// Fall back to the first deterministic match.
		return exactMatches[0];
	}

	// 3) Fallback: map subdomain -> D1 site id, then YAML folder/id, then legacy links submission.
	if (candidate) {
		const { getContentSiteById } = await import('$lib/server/content-store');
		const fromDbId = await getContentSiteById(platform, candidate);
		if (fromDbId) return fromDbId;

		for (const site of sites) {
			if (normalizeHostname(site.siteId) === candidate || normalizeHostname(site.id) === candidate) {
				return site;
			}
		}

		const { resolveApprovedLinksSubmissionSite } = await import(
			'$lib/server/links-submission-sites'
		);
		const dynamicSite = await resolveApprovedLinksSubmissionSite(platform, candidate);
		if (dynamicSite) return dynamicSite;
	}

	return null;
}

