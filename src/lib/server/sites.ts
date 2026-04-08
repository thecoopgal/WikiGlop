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
	routing?: {
		default_page?: string;
		/** First path segment on gloop.gg / www.gloop.gg (e.g. `taf` → this site). */
		gloop_gg_short_slug?: string;
	};
	permissions?: Record<string, unknown>;
};

export type ResolvedSite = SiteConfig & {
	siteId: string; // directory name under /content/sites
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
		theme: obj.theme && typeof obj.theme === 'object' ? (obj.theme as SiteTheme) : undefined,
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

export async function resolveSiteById(siteId: string): Promise<ResolvedSite | null> {
	const key = normalizeHostname(siteId);
	if (!key) return null;
	const sites = await getAllSites();
	return (
		sites.find(
			(s) => normalizeHostname(s.siteId) === key || normalizeHostname(s.id) === key
		) ?? null
	);
}

/** Resolves `gloop.gg/{firstSegment}/...` to a site by id or by `routing.gloop_gg_short_slug`. */
export async function resolveSiteForGloopGgPath(firstSegment: string): Promise<ResolvedSite | null> {
	const key = normalizeHostname(firstSegment);
	if (!key) return null;

	const byId = await resolveSiteById(key);
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

export async function resolveSiteByHostname(hostname: string): Promise<ResolvedSite | null> {
	const hostnameNormalized = normalizeHostname(hostname);
	const sites = await getAllSites();
	const candidate = pickSubdomainCandidate(hostnameNormalized);

	// 1) Exact host allow-list match from site.yaml (highest priority).
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
		// Fall back to the first deterministic match.
		return exactMatches[0];
	}

	// 2) Fallback: map subdomain -> site folder/id (useful for *.localhost in dev and
	// multi-tenant subdomains behind Cloudflare Workers).
	if (candidate) {
		for (const site of sites) {
			if (normalizeHostname(site.siteId) === candidate || normalizeHostname(site.id) === candidate) {
				return site;
			}
		}
	}

	return null;
}

