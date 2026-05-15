/** True for localhost, *.localhost, and common loopback IPs (not for production search / public indexes). */
export function isLocalDevHostname(hostname: string): boolean {
	const h = hostname.trim().toLowerCase();
	if (h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '[::1]' || h === '::1') return true;
	if (h.endsWith('.localhost')) return true;
	return false;
}

/** http(s) URLs that should not appear in GloopGlop search or public glop ingest. */
export function isOmittedFromGloopglopSearch(href: string): boolean {
	try {
		const u = new URL(href);
		if (u.protocol !== 'http:' && u.protocol !== 'https:') return true;
		return isLocalDevHostname(u.hostname);
	} catch {
		return true;
	}
}
