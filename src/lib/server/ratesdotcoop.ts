import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parsePageYaml, type PageYaml } from './content';
import type { ResolvedSite } from './sites';

/**
 * Credit union / org "social" profiles live as individual YAML files under
 * content/sites/<siteId>/profiles/<slug>.yaml — not under pages/, so they are
 * not eager-bundled with import.meta.glob. This scales to thousands of profiles
 * (build stays small; each request reads one file from disk on the server).
 */
export function isRatesdotcoopSite(site: ResolvedSite): boolean {
	return site.siteId === 'ratesdotcoop' || site.kind === 'ratesdotcoop';
}

const PROFILE_SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,127}$/i;

export function loadCreditUnionProfileYaml(site: ResolvedSite, slug: string): PageYaml | null {
	if (!isRatesdotcoopSite(site)) return null;
	const safe = slug.trim();
	if (!PROFILE_SLUG_RE.test(safe)) return null;

	const filePath = join(process.cwd(), 'content', 'sites', site.siteId, 'profiles', `${safe}.yaml`);
	if (!existsSync(filePath)) return null;

	let raw: string;
	try {
		raw = readFileSync(filePath, 'utf-8');
	} catch {
		return null;
	}
	if (!raw.trim()) return null;

	try {
		const page = parsePageYaml(raw, filePath);
		if (page.layout !== 'ratesdotcoop') {
			return null;
		}
		return page;
	} catch {
		return null;
	}
}
