import fs from 'fs/promises';
import path from 'path';
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

function getContentSitesDir() {
	// /content/sites relative to the project root (resolve from this file location).
	// File: src/lib/server/sites.ts -> project root is ../../..
	const projectRoot = path.resolve(import.meta.dirname, '../../..');
	return path.join(projectRoot, 'content', 'sites');
}

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
	const filePath = path.join(getContentSitesDir(), siteId, 'site.yaml');

	let raw: string;
	try {
		raw = await fs.readFile(filePath, 'utf8');
	} catch {
		// Missing site.yaml should just make this site non-resolvable.
		return null;
	}

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
	const dirPath = getContentSitesDir();
	let entries: Array<{ name: string; isDirectory(): boolean }>;

	try {
		entries = await fs.readdir(dirPath, { withFileTypes: true });
	} catch {
		return [];
	}

	const siteIds = entries.filter((e) => e.isDirectory()).map((e) => e.name);

	const sites: ResolvedSite[] = [];
	for (const siteId of siteIds) {
		// eslint-disable-next-line no-await-in-loop
		const site = await loadSiteConfig(siteId);
		if (site) sites.push(site);
	}

	return sites;
}

export async function getAllSites(): Promise<ResolvedSite[]> {
	const isDev =
		(typeof process !== 'undefined' &&
			typeof process.env?.NODE_ENV === 'string' &&
			process.env.NODE_ENV === 'development') ||
		false;
	const CACHE_MS = isDev ? 5_000 : 60_000;
	const now = Date.now();
	if (cache && now - cache.loadedAtMs < CACHE_MS) return cache.sites;

	const sites = await loadAllSites();
	cache = { loadedAtMs: now, sites };
	return sites;
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

