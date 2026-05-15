/** True for localhost, *.localhost, and common loopback IPs (not for production search / public indexes). */
export function isLocalDevHostname(hostname: string): boolean {
	const h = hostname.trim().toLowerCase();
	if (h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '[::1]' || h === '::1') return true;
	if (h.endsWith('.localhost')) return true;
	return false;
}

/**
 * http(s) URLs hidden from search / page ingest (creator Gloop pages, auto-ingest).
 * Only blocks local dev hosts — not the manual glop allowlist.
 */
export function isOmittedFromGloopglopSearch(href: string): boolean {
	try {
		const u = new URL(href);
		if (u.protocol !== 'http:' && u.protocol !== 'https:') return true;
		return isLocalDevHostname(u.hostname);
	} catch {
		return true;
	}
}

/** Host suffix roots for links visitors may submit via “add a glop” (POST /api/glop-search). */
const USER_GLOP_ALLOWED_HOST_ROOTS = [
	'youtube.com',
	'youtu.be',
	'tiktok.com',
	'instagram.com',
	'wikipedia.org',
	'reddit.com',
	'facebook.com',
	'fb.com',
	'fb.watch'
] as const;

export const USER_GLOP_ALLOWED_SITES_LABEL =
	'YouTube, TikTok, Instagram, Wikipedia, Reddit, or Facebook';

function normalizePublicHostname(hostname: string): string {
	return hostname.trim().toLowerCase().replace(/^www\./, '');
}

/** Whether a hostname is on the manual glop allowlist (subdomains included, e.g. en.wikipedia.org). */
export function isAllowedUserGlopHostname(hostname: string): boolean {
	const h = normalizePublicHostname(hostname);
	if (!h || isLocalDevHostname(h)) return false;
	for (const root of USER_GLOP_ALLOWED_HOST_ROOTS) {
		if (h === root || h.endsWith(`.${root}`)) return true;
	}
	return false;
}

/** Manual visitor glops only — does not apply to creator pages or auto-ingest. */
export function isAllowedUserGlopAnswerUrl(href: string): boolean {
	try {
		const u = new URL(href);
		if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
		return isAllowedUserGlopHostname(u.hostname);
	} catch {
		return false;
	}
}
