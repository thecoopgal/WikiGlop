export type LinksCreatorUrlFeedbackLevel = 'ok' | 'warn' | 'error';

export type LinksCreatorUrlFeedback = {
	level: LinksCreatorUrlFeedbackLevel;
	message: string;
	suggestedUrl: string | null;
};

const CLEANER_LINK_MESSAGE =
	'Many sites add tracking to their URLs. We recommend you use the better, cleaner link below (verify it goes to the correct place)';

const TRACKING_QUERY_KEYS = new Set([
	'fbclid',
	'igsh',
	'igshid',
	'si',
	's',
	't',
	'ref',
	'ref_src',
	'ref_url',
	'share_id',
	'is_from_webapp',
	'sender_device',
	'feature',
	'mc_cid',
	'mc_eid',
	'gclid',
	'gbraid',
	'wbraid'
]);

const SHORTENER_HOST_ROOTS = [
	'bit.ly',
	't.co',
	'tinyurl.com',
	'goo.gl',
	'ow.ly',
	'is.gd',
	'buff.ly',
	'rebrand.ly',
	'shorturl.at'
];

function normalizeLinksCreatorUrl(url: string): string {
	const trimmed = url.trim();
	if (!trimmed) return '';
	return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function parseCreatorUrl(url: string): URL | null {
	const normalized = normalizeLinksCreatorUrl(url);
	if (!normalized) return null;
	try {
		const parsed = new URL(normalized);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
		return parsed;
	} catch {
		return null;
	}
}

function normalizeHostname(hostname: string): string {
	return hostname.trim().toLowerCase().replace(/^www\./, '');
}

function hostMatches(hostname: string, root: string): boolean {
	const h = normalizeHostname(hostname);
	return h === root || h.endsWith(`.${root}`);
}

function stripTrackingSearchParams(parsed: URL): boolean {
	let changed = false;
	for (const key of [...parsed.searchParams.keys()]) {
		const lower = key.toLowerCase();
		if (lower.startsWith('utm_') || TRACKING_QUERY_KEYS.has(lower)) {
			parsed.searchParams.delete(key);
			changed = true;
		}
	}
	return changed;
}

function trimTrailingSlash(pathname: string): string {
	if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
	return pathname;
}

function formatCleanUrl(parsed: URL): string {
	const out = new URL(parsed.href);
	out.hostname = out.hostname.toLowerCase();
	out.pathname = trimTrailingSlash(out.pathname);
	if (out.searchParams.toString() === '') out.search = '';
	return out.href;
}

function unwrapYouTubeShare(parsed: URL): URL | null {
	if (!hostMatches(parsed.hostname, 'youtube.com')) return null;
	if (parsed.pathname !== '/share') return null;

	const embedded = parsed.searchParams.get('url');
	if (embedded) {
		const inner = parseCreatorUrl(embedded);
		if (inner) return inner;
	}

	const videoId = parsed.searchParams.get('v');
	if (videoId) {
		return parseCreatorUrl(`https://www.youtube.com/watch?v=${videoId}`);
	}

	return null;
}

function unwrapFacebookShare(parsed: URL): URL | null {
	if (!hostMatches(parsed.hostname, 'facebook.com')) return null;
	if (parsed.pathname !== '/share' && parsed.pathname !== '/sharer' && parsed.pathname !== '/sharer.php') {
		return null;
	}

	const u = parsed.searchParams.get('u') ?? parsed.searchParams.get('href');
	if (u) {
		const inner = parseCreatorUrl(u);
		if (inner) return inner;
	}
	return null;
}

function demobileHost(parsed: URL): boolean {
	const host = normalizeHostname(parsed.hostname);
	const mobileMap: Record<string, string> = {
		'm.youtube.com': 'www.youtube.com',
		'm.facebook.com': 'www.facebook.com',
		'm.twitter.com': 'x.com',
		'mobile.twitter.com': 'x.com',
		'm.instagram.com': 'www.instagram.com'
	};
	const next = mobileMap[host];
	if (!next) return false;
	parsed.hostname = next;
	return true;
}

function isShortenerHost(hostname: string): boolean {
	const h = normalizeHostname(hostname);
	return SHORTENER_HOST_ROOTS.some((root) => h === root || h.endsWith(`.${root}`));
}

function isRedirectWrapperHost(hostname: string): boolean {
	const h = normalizeHostname(hostname);
	return h === 'l.instagram.com' || h === 'lm.facebook.com' || h === 'l.facebook.com';
}

function suggestCleanerUrl(parsed: URL): { url: URL; reasons: string[] } {
	const reasons: string[] = [];
	const out = new URL(parsed.href);

	const unwrappedYoutube = unwrapYouTubeShare(out);
	if (unwrappedYoutube) {
		reasons.push('Unwrapped a YouTube share link');
		return suggestCleanerUrl(unwrappedYoutube);
	}

	const unwrappedFacebook = unwrapFacebookShare(out);
	if (unwrappedFacebook) {
		reasons.push('Unwrapped a Facebook share link');
		return suggestCleanerUrl(unwrappedFacebook);
	}

	if (demobileHost(out)) {
		reasons.push('Switched from a mobile site link');
	}

	if (stripTrackingSearchParams(out)) {
		reasons.push('Removed tracking parameters');
	}

	return { url: out, reasons };
}

export function getLinksCreatorUrlFeedback(url: string): LinksCreatorUrlFeedback | null {
	const trimmed = url.trim();
	if (!trimmed) return null;

	const parsed = parseCreatorUrl(trimmed);
	if (!parsed) {
		return {
			level: 'error',
			message: 'That does not look like a valid web link. Try https://example.com',
			suggestedUrl: null
		};
	}

	const reasons: string[] = [];
	let level: LinksCreatorUrlFeedbackLevel = 'ok';

	if (isRedirectWrapperHost(parsed.hostname)) {
		level = 'warn';
		reasons.push('This looks like a redirect wrapper — paste the final destination link instead');
	}

	if (isShortenerHost(parsed.hostname) || hostMatches(parsed.hostname, 'vm.tiktok.com')) {
		level = 'warn';
		reasons.push('Short links can break later — use the full profile or page URL when you can');
	}

	if (hostMatches(parsed.hostname, 'youtube.com') && parsed.pathname === '/share') {
		level = 'warn';
		reasons.push('YouTube share links are messy — use the direct video or channel URL');
	}

	if (
		hostMatches(parsed.hostname, 'facebook.com') &&
		(parsed.pathname === '/share' || parsed.pathname === '/sharer' || parsed.pathname === '/sharer.php')
	) {
		level = 'warn';
		reasons.push('Facebook share links are messy — use the direct page or post URL');
	}

	if (hostMatches(parsed.hostname, 'twitter.com') && parsed.pathname.startsWith('/intent/')) {
		level = 'warn';
		reasons.push('That is a Twitter action link, not a page link');
	}

	const cleaned = suggestCleanerUrl(parsed);
	const suggestedUrl = formatCleanUrl(cleaned.url);
	const currentNormalized = formatCleanUrl(parsed);
	const hasCleanerSuggestion = suggestedUrl !== currentNormalized;

	if (cleaned.reasons.length > 0 || hasCleanerSuggestion) {
		level = 'warn';
	}

	if (level === 'ok') return null;

	const message = hasCleanerSuggestion
		? CLEANER_LINK_MESSAGE
		: reasons.length > 0
			? reasons.join('. ')
			: 'This link might be hard for visitors to use';

	return {
		level,
		message,
		suggestedUrl: hasCleanerSuggestion ? suggestedUrl : null
	};
}
