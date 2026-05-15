/** Default GloopGlop booger used when no per-link image is available. */
export const GLOOPGLOP_DEFAULT_LOGO_URL =
	'https://imagedelivery.net/zdMtZgMUbYs7-R4-dRSl-Q/907061a8-51ae-454c-c739-83935616f900/public';

/** Google S2 favicon for a URL hostname (search result fallback). */
export function faviconUrlForAnswerUrl(href: string): string | null {
	try {
		const hostname = new URL(href).hostname;
		if (!hostname) return null;
		return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128`;
	} catch {
		return null;
	}
}

/** Card thumbnail: YAML/SEO image → site favicon → GloopGlop logo. */
export function resolveGlopSearchCardImage(href: string, seoImage?: string | null): string {
	const custom = seoImage?.trim();
	if (custom) return custom;
	return faviconUrlForAnswerUrl(href) ?? GLOOPGLOP_DEFAULT_LOGO_URL;
}
