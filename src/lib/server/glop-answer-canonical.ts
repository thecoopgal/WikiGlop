import { canonicalOriginForSite } from '$lib/server/content';
import { parseGlopAnswerUrl } from '$lib/server/glop-search';
import { resolveSiteByHostname, resolveSiteForGloopGgPath } from '$lib/server/sites';

/** Build absolute href from canonical origin + path/search/hash. */
function joinOriginPath(origin: string, pathname: string, search: string, hash: string): string {
	const o = origin.replace(/\/$/, '');
	const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
	return new URL(`${p}${search}${hash}`, `${o}/`).href;
}

function normalizeGenericUrlHref(u: URL): string {
	try {
		const out = new URL(u.href);
		out.hostname = out.hostname.toLowerCase();
		if (out.pathname.length > 1 && out.pathname.endsWith('/')) {
			out.pathname = out.pathname.slice(0, -1) || '/';
		}
		return out.href;
	} catch {
		return u.href;
	}
}

/**
 * Maps stored answer URLs to one canonical href so e.g. `gloop.gg/taf/foo` and
 * `https://taf.gloopglop.com/foo` (same site + path) dedupe in search UI.
 */
export async function canonicalGlopAnswerHref(rawUrl: string): Promise<string> {
	const u = parseGlopAnswerUrl(rawUrl);
	if (!u) return rawUrl.trim();

	const host = u.hostname.toLowerCase();
	const pathname = u.pathname || '/';
	const search = u.search ?? '';
	const hash = u.hash ?? '';

	if (host === 'gloop.gg' || host === 'www.gloop.gg') {
		const segments = pathname.split('/').filter(Boolean);
		const siteKey = segments[0] ?? '';
		const restPath = segments.length <= 1 ? '/' : `/${segments.slice(1).join('/')}`;
		if (siteKey) {
			const site = await resolveSiteForGloopGgPath(siteKey);
			if (site) {
				const faux = new URL(u.href);
				faux.hostname = 'gloop.gg';
				const origin = canonicalOriginForSite(site, faux);
				if (origin) {
					return joinOriginPath(origin, restPath, search, hash);
				}
			}
		}
	}

	if (host.endsWith('.gloop.gg') && host !== 'gloop.gg' && host !== 'www.gloop.gg') {
		let label = host.slice(0, -'.gloop.gg'.length);
		if (label.startsWith('www.')) label = label.slice(4);
		if (label) {
			const site = await resolveSiteForGloopGgPath(label);
			if (site) {
				const faux = new URL(u.href);
				faux.hostname = 'gloop.gg';
				const origin = canonicalOriginForSite(site, faux);
				if (origin) {
					return joinOriginPath(origin, pathname, search, hash);
				}
			}
		}
	}

	if (host === 'gloopglop.com' || host.endsWith('.gloopglop.com')) {
		const site = await resolveSiteByHostname(host);
		if (site) {
			const origin = canonicalOriginForSite(site, u);
			if (origin) {
				return joinOriginPath(origin, pathname, search, hash);
			}
		}
	}

	return normalizeGenericUrlHref(u);
}

/** True when the canonical URL is on the Gloop / GloopGlop host family (creator pages, short links, platform). */
export function isGloopglopNetworkCanonicalHref(canonicalHref: string): boolean {
	try {
		const u = new URL(canonicalHref);
		const h = u.hostname.toLowerCase();
		if (h === 'gloop.gg' || h === 'www.gloop.gg') return true;
		if (h.endsWith('.gloop.gg')) return true;
		if (h === 'gloopglop.com' || h === 'www.gloopglop.com') return true;
		if (h.endsWith('.gloopglop.com')) return true;
		return false;
	} catch {
		return false;
	}
}

export async function buildCanonicalHrefByAnswerUrl(answerUrls: string[]): Promise<Record<string, string>> {
	const unique = [...new Set(answerUrls.map((x) => x.trim()).filter(Boolean))];
	const out: Record<string, string> = {};
	await Promise.all(
		unique.map(async (orig) => {
			out[orig] = await canonicalGlopAnswerHref(orig);
		})
	);
	return out;
}
