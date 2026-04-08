import type { PageYaml, RegionLockConfig } from './content';

type IncomingRequestCf = {
	country?: string | null;
	regionCode?: string | null;
};

function isLocalLikeHost(hostname: string): boolean {
	const h = hostname.trim().toLowerCase();
	return h === 'localhost' || h.endsWith('.localhost') || h === '127.0.0.1';
}

function cfFromRequest(request: Request): IncomingRequestCf | undefined {
	const r = request as Request & { cf?: IncomingRequestCf };
	return r.cf && typeof r.cf === 'object' ? r.cf : undefined;
}

/**
 * Best-effort geo from Cloudflare (`request.cf` on Workers) or proxied headers.
 */
export function getClientGeo(request: Request): { country: string | null; regionCode: string | null } {
	const cf = cfFromRequest(request);
	const fromHeader = (name: string) => request.headers.get(name)?.trim().toUpperCase() || null;

	const country =
		(cf?.country && String(cf.country).toUpperCase()) ||
		fromHeader('cf-ipcountry') ||
		null;

	const regionCode =
		(cf?.regionCode && String(cf.regionCode).toUpperCase()) ||
		fromHeader('cf-region-code') ||
		null;

	return { country, regionCode };
}

function normalizeCodes(list: string[] | undefined): string[] {
	if (!list?.length) return [];
	return list.map((c) => c.trim().toUpperCase()).filter(Boolean);
}

export function normalizeRegionLock(config: RegionLockConfig): {
	countries: string[];
	subdivisions: string[];
} {
	let countries = normalizeCodes(config.countries);
	const subdivisions = normalizeCodes(config.subdivisions);
	if (subdivisions.length && !countries.length) countries = ['US'];
	return { countries, subdivisions };
}

/**
 * Returns true when the visitor should not see region-restricted content.
 */
export function isBlockedByRegionLock(
	page: PageYaml,
	geo: { country: string | null; regionCode: string | null },
	opts: { hostname: string; allowUnknownGeoFallback: boolean }
): boolean {
	const raw = page.region_lock as RegionLockConfig | undefined;
	if (!raw || typeof raw !== 'object') return false;

	const { countries, subdivisions } = normalizeRegionLock(raw);
	if (!countries.length && !subdivisions.length) return false;

	const unknownGeo = !geo.country && !geo.regionCode;
	if (unknownGeo) {
		if (raw.allow_unknown_geo === true) return false;
		if (opts.allowUnknownGeoFallback) return false;
		return true;
	}

	if (countries.length) {
		if (!geo.country || !countries.includes(geo.country)) return true;
	}

	if (subdivisions.length) {
		const rc = geo.regionCode;
		if (!rc || !subdivisions.includes(rc)) return true;
	}

	return false;
}

/**
 * Local / single-site dev: allow access when geo headers are missing so pages stay testable.
 */
export function allowUnknownGeoForDevHostname(hostname: string, importMetaDev: boolean): boolean {
	if (importMetaDev && isLocalLikeHost(hostname)) return true;
	return false;
}

/** Path + query to show the region-unavailable message (optionally includes `from` for context). */
export function regionUnavailablePath(requestUrl: URL): string {
	const from = `${requestUrl.pathname}${requestUrl.search}`;
	const q = new URLSearchParams();
	if (from && from !== '/region-unavailable') q.set('from', from);
	return `/region-unavailable${q.toString() ? `?${q}` : ''}`;
}
