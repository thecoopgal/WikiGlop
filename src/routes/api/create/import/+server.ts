import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

type ImportLink = { label: string; icon: string; href: string };

function safeUrl(input: string): URL | null {
	try {
		const u = new URL(input.trim());
		if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
		return u;
	} catch {
		return null;
	}
}

function getMeta(html: string, propOrName: string): string | null {
	// Very small HTML metadata extractor. Good enough for OG/Twitter cards.
	const re = new RegExp(
		`<meta[^>]+(?:property|name)=["']${propOrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]+content=["']([^"']+)["'][^>]*>`,
		'i'
	);
	const m = html.match(re);
	return m?.[1]?.trim() || null;
}

function getTitle(html: string): string | null {
	const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
	return m?.[1]?.trim() || null;
}

function normalizeSpace(s: string): string {
	return s.replace(/\s+/g, ' ').trim();
}

function hostnameIcon(href: string): { icon: string; label: string } {
	let host = '';
	try {
		host = new URL(href).hostname.toLowerCase();
	} catch {
		return { icon: 'link', label: 'Link' };
	}
	if (host.includes('instagram.com')) return { icon: 'instagram', label: 'Instagram' };
	if (host.includes('tiktok.com')) return { icon: 'tiktok', label: 'TikTok' };
	if (host.includes('youtube.com') || host.includes('youtu.be')) return { icon: 'youtube', label: 'YouTube' };
	if (host.includes('x.com') || host.includes('twitter.com')) return { icon: 'twitter', label: 'X' };
	if (host.includes('facebook.com')) return { icon: 'facebook', label: 'Facebook' };
	if (host.includes('threads.net')) return { icon: 'threads', label: 'Threads' };
	if (host.includes('twitch.tv')) return { icon: 'twitch', label: 'Twitch' };
	if (host.includes('patreon.com')) return { icon: 'patreon', label: 'Patreon' };
	if (host.includes('ko-fi.com') || host.includes('kofi.com')) return { icon: 'kofi', label: 'Ko‑fi' };
	if (host.includes('cash.app')) return { icon: 'cashapp', label: 'Cash App' };
	if (host.includes('etsy.com')) return { icon: 'etsy', label: 'Etsy' };
	if (host.includes('shopify.com')) return { icon: 'shop', label: 'Shop' };
	return { icon: 'link', label: 'Link' };
}

function extractLinks(html: string, baseUrl: URL): ImportLink[] {
	const out: ImportLink[] = [];
	const seen = new Set<string>();

	// Crude anchor extraction. We intentionally keep this tiny and dependency-free.
	// Matches: <a ... href="...">text</a>
	const re = /<a\b[^>]*\bhref=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html))) {
		const rawHref = m[1]?.trim();
		if (!rawHref) continue;
		if (rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) continue;
		if (rawHref.startsWith('javascript:')) continue;

		let abs: string;
		try {
			abs = new URL(rawHref, baseUrl).toString();
		} catch {
			continue;
		}

		// Skip same-page / tracking-ish duplicates.
		if (seen.has(abs)) continue;
		seen.add(abs);

		let label = normalizeSpace(m[2]?.replace(/<[^>]+>/g, '') ?? '');
		const hostInfo = hostnameIcon(abs);
		if (!label) label = hostInfo.label;

		out.push({ label: label.slice(0, 80), icon: hostInfo.icon, href: abs });
		if (out.length >= 12) break;
	}

	return out;
}

export const POST: RequestHandler = async ({ request, fetch }) => {
	let bodyIn: unknown;
	try {
		bodyIn = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}
	if (!bodyIn || typeof bodyIn !== 'object') throw error(400, 'Invalid body');
	const body = bodyIn as Record<string, unknown>;
	const urlRaw = typeof body.url === 'string' ? body.url : '';
	const url = safeUrl(urlRaw);
	if (!url) throw error(400, 'Invalid url');

	const res = await fetch(url.toString(), {
		headers: {
			// Some link-in-bio tools return different HTML for bots; this is a reasonable browser-ish UA.
			'user-agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
		}
	});
	if (!res.ok) throw error(502, `Fetch failed: ${res.status}`);

	const contentType = res.headers.get('content-type') ?? '';
	if (!contentType.toLowerCase().includes('text/html')) {
		throw error(415, 'URL did not return HTML');
	}
	const html = await res.text();

	const ogTitle = getMeta(html, 'og:title') ?? getMeta(html, 'twitter:title');
	const ogDesc = getMeta(html, 'og:description') ?? getMeta(html, 'twitter:description');
	const ogImage = getMeta(html, 'og:image') ?? getMeta(html, 'twitter:image');
	const title = ogTitle ?? getTitle(html);
	const description = ogDesc ?? null;

	const links = extractLinks(html, url);

	return json({
		ok: true,
		data: {
			title: title ? title.slice(0, 120) : null,
			description: description ? description.slice(0, 280) : null,
			image: ogImage ? ogImage.slice(0, 500) : null,
			links
		}
	});
};

