import type { PageYaml } from '$lib/server/content';
import {
	expandCreatorLinksShortcuts,
	loadPageYaml,
	publicGloopglopCreatorOriginForSearch
} from '$lib/server/content';
import { insertGlopAnswerIfAbsent, parseGlopAnswerUrl } from '$lib/server/glop-search';
import type { ResolvedSite } from '$lib/server/sites';
import { getAllSites } from '$lib/server/sites';
import { isOmittedFromGloopglopSearch } from '$lib/server/url-public';

const GLOOPGLOP_SEARCH_SITE_ID = 'gloopglop';
const MAX_URLS_PER_PAGE = 48;

function isGloopglopThemeSite(site: ResolvedSite): boolean {
	const p = site.theme?.preset;
	return typeof p === 'string' && p.trim().toLowerCase() === 'gloopglop';
}

/** Resolves site-relative paths and bare Gloop / http(s) URLs to an absolute http(s) href. */
function resolveToHttpHref(href: string | undefined, base: URL): string | null {
	if (!href) return null;
	const t = href.trim();
	if (!t || t === '#' || t.startsWith('#')) return null;
	const lower = t.toLowerCase();
	if (
		lower.startsWith('mailto:') ||
		lower.startsWith('tel:') ||
		lower.startsWith('javascript:') ||
		lower.startsWith('data:')
	) {
		return null;
	}
	if (t.startsWith('/')) {
		try {
			const u = new URL(t, base);
			if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
			return u.href;
		} catch {
			return null;
		}
	}
	const bare = parseGlopAnswerUrl(t);
	if (bare && (bare.protocol === 'http:' || bare.protocol === 'https:')) return bare.href;
	return null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null;
}

/** Per-link image from YAML (`seo_image`, `seo_icon`, `logo_override`, or `image`). */
function linkItemImageUrl(raw: Record<string, unknown>): string | null {
	for (const key of ['seo_image', 'seo_icon', 'logo_override', 'image'] as const) {
		const v = typeof raw[key] === 'string' ? raw[key].trim() : '';
		if (v.startsWith('http://') || v.startsWith('https://')) return v;
	}
	return null;
}

function collectFromLinksItems(
	items: unknown,
	base: URL,
	pageTitle: string,
	out: Map<string, string>
): void {
	if (!Array.isArray(items)) return;
	for (const raw of items) {
		if (!isRecord(raw)) continue;
		if (raw.status === 'not_found') continue;
		const href = typeof raw.href === 'string' ? raw.href : '';
		const abs = resolveToHttpHref(href, base);
		if (!abs || isOmittedFromGloopglopSearch(abs)) continue;
		const labelRaw = typeof raw.label === 'string' ? raw.label.trim() : '';
		const label = labelRaw.length >= 2 ? labelRaw : pageTitle;
		if (!out.has(abs)) out.set(abs, label);
	}
}

function collectImagesFromLinksItems(items: unknown, base: URL, out: Map<string, string>): void {
	if (!Array.isArray(items)) return;
	for (const raw of items) {
		if (!isRecord(raw)) continue;
		if (raw.status === 'not_found') continue;
		const href = typeof raw.href === 'string' ? raw.href : '';
		const abs = resolveToHttpHref(href, base);
		if (!abs || isOmittedFromGloopglopSearch(abs)) continue;
		const img = linkItemImageUrl(raw);
		if (img && !out.has(abs)) out.set(abs, img);
	}
}

function walkBlocksForImages(blocks: unknown, base: URL, out: Map<string, string>): void {
	if (!Array.isArray(blocks)) return;
	for (const b of blocks) {
		if (!isRecord(b)) continue;
		const type = typeof b.type === 'string' ? b.type.trim().toLowerCase() : '';

		if (type === 'section' && Array.isArray(b.blocks)) {
			walkBlocksForImages(b.blocks, base, out);
			continue;
		}

		if (type === 'links') {
			collectImagesFromLinksItems(b.items, base, out);
			continue;
		}

		if (type === 'creator_profile') {
			if (Array.isArray(b.short_links)) {
				collectImagesFromLinksItems(b.short_links, base, out);
			}
			if (Array.isArray(b.short_link_groups)) {
				for (const group of b.short_link_groups) {
					if (!isRecord(group) || !Array.isArray(group.links)) continue;
					collectImagesFromLinksItems(group.links, base, out);
				}
			}
			const avatar = typeof b.avatar === 'string' ? b.avatar.trim() : '';
			if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
				const home = new URL('/', base).href;
				if (!isOmittedFromGloopglopSearch(home) && !out.has(home)) out.set(home, avatar);
			}
			continue;
		}

		if (type === 'hero' && Array.isArray(b.cta)) {
			collectImagesFromLinksItems(b.cta, base, out);
		}

		if (type === 'slideshow' || type === 'gallery') {
			const first = firstHttpImageFromSlideshowOrGallery(b);
			if (first) {
				const home = new URL('/', base).href;
				if (!isOmittedFromGloopglopSearch(home) && !out.has(home)) out.set(home, first);
			}
		}
	}
}

function firstHttpImageFromSlideshowOrGallery(block: Record<string, unknown>): string | null {
	if (Array.isArray(block.items)) {
		for (const raw of block.items) {
			if (!isRecord(raw)) continue;
			const img = typeof raw.image === 'string' ? raw.image.trim() : '';
			if (img.startsWith('http://') || img.startsWith('https://')) return img;
		}
	}
	if (Array.isArray(block.images)) {
		for (const raw of block.images) {
			const img = typeof raw === 'string' ? raw.trim() : '';
			if (img.startsWith('http://') || img.startsWith('https://')) return img;
		}
	}
	return null;
}

function walkBlocks(blocks: unknown, base: URL, pageTitle: string, out: Map<string, string>): void {
	if (!Array.isArray(blocks)) return;
	for (const b of blocks) {
		if (!isRecord(b)) continue;
		const type = typeof b.type === 'string' ? b.type.trim().toLowerCase() : '';

		if (type === 'section' && Array.isArray(b.blocks)) {
			walkBlocks(b.blocks, base, pageTitle, out);
			continue;
		}

		if (type === 'links') {
			collectFromLinksItems(b.items, base, pageTitle, out);
			continue;
		}

		if (type === 'creator_profile') {
			if (Array.isArray(b.short_links)) {
				collectFromLinksItems(b.short_links, base, pageTitle, out);
			}
			if (Array.isArray(b.short_link_groups)) {
				for (const group of b.short_link_groups) {
					if (!isRecord(group) || !Array.isArray(group.links)) continue;
					collectFromLinksItems(group.links, base, pageTitle, out);
				}
			}
			continue;
		}

		if (type === 'hero' && Array.isArray(b.cta)) {
			for (const raw of b.cta) {
				if (!isRecord(raw)) continue;
				const href = typeof raw.href === 'string' ? raw.href : '';
				const abs = resolveToHttpHref(href, base);
				if (!abs || isOmittedFromGloopglopSearch(abs)) continue;
				const labelRaw = typeof raw.label === 'string' ? raw.label.trim() : '';
				const label = labelRaw.length >= 2 ? labelRaw : pageTitle;
				if (!out.has(abs)) out.set(abs, label);
			}
		}
	}
}

function buildQueryForLink(pageTitle: string, linkLabel: string, absoluteHref: string): string {
	const title = pageTitle.trim() || 'Page';
	const label = linkLabel.trim();
	let q: string;
	if (label.length >= 3) {
		q = `${title}: ${label}`;
	} else {
		try {
			const host = new URL(absoluteHref).hostname;
			q = `${title} — ${host}`;
		} catch {
			q = title;
		}
	}
	if (q.length < 3) q = absoluteHref.slice(0, Math.min(absoluteHref.length, 80));
	if (q.length > 500) q = q.slice(0, 500);
	return q;
}

/**
 * Absolute http(s) hrefs from links, creator_profile short_links, hero CTAs, and nested sections.
 * @param displayTitleFallback Used when the page has no title/id (e.g. site name).
 */
export function collectHttpHrefLabelsFromPage(
	page: PageYaml,
	baseUrl: URL,
	displayTitleFallback?: string
): Map<string, string> {
	const pageTitle =
		(typeof page.title === 'string' && page.title.trim()) ||
		(typeof page.id === 'string' && page.id.trim()) ||
		displayTitleFallback?.trim() ||
		'Page';
	const out = new Map<string, string>();
	walkBlocks(page.blocks, baseUrl, pageTitle, out);
	return out;
}

/**
 * Image URLs declared on gloopglop-theme pages (link `seo_image` / `logo_override`, page `seo.image`, profile `avatar`).
 */
export function collectHttpHrefImagesFromPage(page: PageYaml, baseUrl: URL): Map<string, string> {
	const out = new Map<string, string>();
	const seoImg =
		typeof page.seo?.image === 'string' && page.seo.image.trim().startsWith('http')
			? page.seo.image.trim()
			: null;
	const home = new URL('/', baseUrl).href;
	if (seoImg && !isOmittedFromGloopglopSearch(home)) out.set(home, seoImg);
	walkBlocksForImages(page.blocks, baseUrl, out);
	return out;
}

/** All gloopglop creator sites: href → YAML image for search result thumbnails. */
export async function buildGloopglopYamlImageByUrl(requestUrl: URL): Promise<Map<string, string>> {
	const out = new Map<string, string>();
	const sites = await getAllSites();
	for (const site of sites) {
		if (!isGloopglopThemeSite(site)) continue;
		const origin = publicGloopglopCreatorOriginForSearch(site);
		if (!origin) continue;
		const base = new URL(origin);
		const indexPage = await loadPageYaml(site, []);
		if (!indexPage) continue;
		const hydrated = await expandCreatorLinksShortcuts(site, indexPage, requestUrl);
		const imgs = collectHttpHrefImagesFromPage(hydrated, base);
		for (const [href, img] of imgs) {
			if (!out.has(href)) out.set(href, img);
		}
	}
	return out;
}

type CfPlatform = App.Platform & {
	context?: { waitUntil?: (task: Promise<unknown>) => void };
	ctx?: { waitUntil?: (task: Promise<unknown>) => void };
};

/**
 * Background task: add http(s) links from this page to GloopGlop search (`glop_answers`),
 * skipping URLs already present. Only runs for sites using the `gloopglop` theme preset.
 */
export async function ingestGloopglopPageLinksToSearch(params: {
	platform: App.Platform | undefined;
	requestUrl: URL;
	site: ResolvedSite;
	page: PageYaml;
}): Promise<void> {
	const { platform, requestUrl, site, page } = params;
	if (!isGloopglopThemeSite(site)) return;

	const displayFallback = site.name?.trim() || site.id?.trim() || '';
	const pageTitle =
		(typeof page.title === 'string' && page.title.trim()) ||
		(typeof page.id === 'string' && page.id.trim()) ||
		displayFallback ||
		'Page';

	const hrefToLabel = collectHttpHrefLabelsFromPage(page, requestUrl, displayFallback);

	let n = 0;
	for (const [href, label] of hrefToLabel) {
		if (n >= MAX_URLS_PER_PAGE) break;
		const queryRaw = buildQueryForLink(pageTitle, label, href);
		// eslint-disable-next-line no-await-in-loop
		const result = await insertGlopAnswerIfAbsent({
			platform,
			siteId: GLOOPGLOP_SEARCH_SITE_ID,
			queryRaw,
			answerUrl: href
		});
		if (result === 'inserted' || result === 'skipped') n += 1;
	}
}

export function scheduleGloopglopPageGlopIngest(params: {
	platform: App.Platform | undefined;
	requestUrl: URL;
	site: ResolvedSite;
	page: PageYaml;
}): void {
	if (!isGloopglopThemeSite(params.site)) return;

	const work = ingestGloopglopPageLinksToSearch(params).catch((err) => {
		console.error('GloopGlop page link ingest failed:', err);
	});

	const ctx =
		(params.platform as CfPlatform | undefined)?.context ??
		(params.platform as CfPlatform | undefined)?.ctx;
	if (ctx && typeof ctx.waitUntil === 'function') {
		ctx.waitUntil(work);
	} else {
		void work;
	}
}
