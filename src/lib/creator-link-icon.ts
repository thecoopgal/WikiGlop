import { GLOOPGLOP_DEFAULT_LOGO_URL } from '$lib/glop-link-image';

export function normalizeCreatorLinkHref(url: string): string | null {
	const trimmed = url.trim();
	if (!trimmed) return null;
	const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
	try {
		const parsed = new URL(href);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
		return parsed.href;
	} catch {
		return null;
	}
}

export function normalizeCreatorLinkIconKey(value: string | undefined): string {
	return (value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
}

/** Same hostname → icon mapping used when importing creator links. */
export function hostnameIconKey(href: string): string {
	let host = '';
	try {
		host = new URL(href).hostname.toLowerCase();
	} catch {
		return 'link';
	}
	if (host.includes('instagram.com')) return 'instagram';
	if (host.includes('tiktok.com')) return 'tiktok';
	if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
	if (host.includes('x.com') || host.includes('twitter.com')) return 'twitter';
	if (host.includes('facebook.com')) return 'facebook';
	if (host.includes('linkedin.com')) return 'linkedin';
	if (host.includes('threads.net') || host.includes('threads.com')) return 'threads';
	if (host.includes('twitch.tv')) return 'twitch';
	if (host.includes('patreon.com')) return 'patreon';
	if (host.includes('ko-fi.com') || host.includes('kofi.com')) return 'kofi';
	if (host.includes('cash.app')) return 'cashapp';
	if (host.includes('etsy.com')) return 'etsy';
	if (host.includes('shopify.com')) return 'shop';
	return 'link';
}

function creatorLinkHostname(href: string): string | null {
	try {
		return new URL(href).hostname;
	} catch {
		return null;
	}
}

function isGloopglopNetworkHost(hostname: string): boolean {
	return (
		hostname === 'gloopglop.com' ||
		hostname.endsWith('.gloopglop.com') ||
		hostname === 'localhost' ||
		hostname.endsWith('.localhost') ||
		hostname === '127.0.0.1'
	);
}

export function creatorLinkFaviconUrl(href: string): string | null {
	const hostname = creatorLinkHostname(href);
	if (!hostname) return null;
	return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
}

export function creatorLinkCardImageUrl(href: string): string | null {
	if (!href || href === '#') return null;
	if (href.startsWith('/')) return GLOOPGLOP_DEFAULT_LOGO_URL;
	const hostname = creatorLinkHostname(href);
	if (hostname && isGloopglopNetworkHost(hostname)) return GLOOPGLOP_DEFAULT_LOGO_URL;
	return creatorLinkFaviconUrl(href);
}

const BRANDED_ICON_KEYS = new Set([
	'instagram',
	'linkedin',
	'facebook',
	'youtube',
	'yt',
	'tiktok',
	'threads',
	'twitter',
	'twitch',
	'patreon',
	'kofi',
	'cashapp',
	'etsy',
	'shop',
	'store',
	'home',
	'document',
	'doc',
	'users',
	'people',
	'venmo',
	'cash',
	'coffee',
	'website',
	'web'
]);

export type CreatorLinkIconMode = 'basic' | 'official' | 'none' | 'gloopglop';

export type CreatorLinkIconDisplay =
	| { kind: 'brand'; key: string }
	| { kind: 'image'; url: string }
	| { kind: 'none' };

export function isCreatorLinkIconMode(value: unknown): value is CreatorLinkIconMode {
	return (
		value === 'basic' ||
		value === 'official' ||
		value === 'none' ||
		value === 'gloopglop'
	);
}

function shortLinkHasImageOverride(link: {
	seo_image?: string;
	seo_icon?: string;
	logo_override?: string;
}): boolean {
	for (const key of ['seo_image', 'seo_icon', 'logo_override'] as const) {
		const value = (link[key] ?? '').trim();
		if (value.startsWith('http://') || value.startsWith('https://')) return true;
	}
	return false;
}

/** Match live creator pages: YAML override → branded MDI → favicon card image. */
export function inferCreatorLinkIconModeFromShortLink(item: {
	href: string;
	icon_mode?: unknown;
	seo_image?: string;
	seo_icon?: string;
	logo_override?: string;
}): CreatorLinkIconMode {
	if (isCreatorLinkIconMode(item.icon_mode)) return item.icon_mode;
	if (shortLinkHasImageOverride(item)) return 'official';

	const normalized = normalizeCreatorLinkHref(item.href);
	if (!normalized) return 'basic';

	const iconKey = normalizeCreatorLinkIconKey(hostnameIconKey(normalized));
	if (BRANDED_ICON_KEYS.has(iconKey)) return 'basic';
	if (creatorLinkFaviconUrl(normalized)) return 'official';

	return 'basic';
}

export function defaultCreatorLinkIconMode(href: string): CreatorLinkIconMode {
	const normalized = normalizeCreatorLinkHref(href);
	if (!normalized) return 'basic';
	const iconKey = normalizeCreatorLinkIconKey(hostnameIconKey(normalized));
	if (BRANDED_ICON_KEYS.has(iconKey)) return 'basic';
	if (creatorLinkCardImageUrl(normalized)) return 'official';
	return 'basic';
}

export function canChooseCreatorLinkIcon(href: string): boolean {
	return normalizeCreatorLinkHref(href) != null;
}

export const CREATOR_LINK_ICON_CYCLE_ORDER: CreatorLinkIconMode[] = [
	'basic',
	'official',
	'gloopglop',
	'none'
];

export function nextCreatorLinkIconMode(
	current: CreatorLinkIconMode,
	href: string
): CreatorLinkIconMode {
	if (!canChooseCreatorLinkIcon(href)) return current;
	const order = CREATOR_LINK_ICON_CYCLE_ORDER;
	const index = order.indexOf(current);
	const nextIndex = index === -1 ? 0 : (index + 1) % order.length;
	return order[nextIndex];
}

/** Basic = platform MDI icon; official = site favicon / logo image. */
export function resolveCreatorLinkIconDisplay(
	href: string,
	mode: CreatorLinkIconMode = 'basic'
): CreatorLinkIconDisplay | null {
	const normalized = normalizeCreatorLinkHref(href);
	if (!normalized) return null;

	if (mode === 'none') {
		return { kind: 'none' };
	}

	if (mode === 'gloopglop') {
		return { kind: 'image', url: GLOOPGLOP_DEFAULT_LOGO_URL };
	}

	const iconKey = normalizeCreatorLinkIconKey(hostnameIconKey(normalized));

	if (mode === 'official') {
		const image = creatorLinkCardImageUrl(normalized);
		if (image) return { kind: 'image', url: image };
	}

	if (mode === 'basic') {
		if (BRANDED_ICON_KEYS.has(iconKey)) {
			return { kind: 'brand', key: iconKey };
		}
		return { kind: 'brand', key: 'link' };
	}

	if (BRANDED_ICON_KEYS.has(iconKey)) {
		return { kind: 'brand', key: iconKey };
	}

	const image = creatorLinkCardImageUrl(normalized);
	if (image) return { kind: 'image', url: image };

	return null;
}
