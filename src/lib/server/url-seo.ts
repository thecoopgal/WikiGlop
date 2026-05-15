import { parseGlopAnswerUrl } from '$lib/server/glop-search';

export type UrlSeoSnippet = {
	title: string | null;
	description: string | null;
};

const FETCH_TIMEOUT_MS = 4500;
const READ_MAX_BYTES = 96 * 1024;

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Block obvious SSRF / loopback targets when prefetching HTML for SEO. */
export function isBlockedSeoFetchHostname(hostname: string): boolean {
	const h = hostname.trim().toLowerCase();
	if (!h) return true;
	if (h === 'localhost' || h.endsWith('.localhost')) return true;
	if (h.endsWith('.local')) return true;
	if (h === '0.0.0.0' || h === '127.0.0.1' || h === '::1' || h === '[::1]') return true;
	if (h === 'metadata.google.internal' || h === '169.254.169.254') return true;

	const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
	if (ipv4) {
		const a = Number(ipv4[1]);
		const b = Number(ipv4[2]);
		if (a === 10) return true;
		if (a === 127) return true;
		if (a === 0) return true;
		if (a === 172 && b >= 16 && b <= 31) return true;
		if (a === 192 && b === 168) return true;
		if (a === 169 && b === 254) return true;
	}
	return false;
}

function decodeHtmlEntities(raw: string): string {
	let s = raw;
	s = s.replace(/&nbsp;/gi, ' ');
	s = s.replace(/&amp;/gi, '&');
	s = s.replace(/&lt;/gi, '<');
	s = s.replace(/&gt;/gi, '>');
	s = s.replace(/&quot;/gi, '"');
	s = s.replace(/&#039;/g, "'");
	s = s.replace(/&#39;/g, "'");
	s = s.replace(/&apos;/gi, "'");
	s = s.replace(/&#x27;/gi, "'");
	s = s.replace(/&#(\d+);/g, (full, n) => {
		const code = Number(n);
		return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : full;
	});
	s = s.replace(/&#x([0-9a-f]+);/gi, (full, hex) => {
		const code = parseInt(hex, 16);
		return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : full;
	});
	return s.replace(/\s+/g, ' ').trim();
}

function stripTags(s: string): string {
	return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function metaContent(head: string, attr: 'property' | 'name', value: string): string | null {
	const esc = escapeRegExp(value);
	const patterns = [
		new RegExp(`<meta[^>]+${attr}=["']${esc}["'][^>]*content=["']([^"']*)["']`, 'i'),
		new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${esc}["']`, 'i')
	];
	for (const re of patterns) {
		const m = head.match(re);
		if (m?.[1]) return m[1];
	}
	return null;
}

function extractSeoFromHtml(html: string): UrlSeoSnippet {
	const lower = html.toLowerCase();
	const headEnd = lower.indexOf('</head>');
	const head = headEnd > 0 ? html.slice(0, headEnd + 7) : html.slice(0, Math.min(html.length, READ_MAX_BYTES));

	const ogTitle = metaContent(head, 'property', 'og:title') || metaContent(head, 'name', 'og:title');
	const twTitle = metaContent(head, 'name', 'twitter:title');
	const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
	const titleRaw = (ogTitle || twTitle || titleMatch?.[1] || '').trim();
	const title = titleRaw ? decodeHtmlEntities(stripTags(titleRaw)) : null;

	const ogDesc =
		metaContent(head, 'property', 'og:description') ||
		metaContent(head, 'name', 'og:description') ||
		metaContent(head, 'name', 'twitter:description');
	const metaDesc = metaContent(head, 'name', 'description');
	const descRaw = (ogDesc || metaDesc || '').trim();
	const description = descRaw ? decodeHtmlEntities(stripTags(descRaw)) : null;

	return {
		title: title && title.length > 0 ? title.slice(0, 500) : null,
		description: description && description.length > 0 ? description.slice(0, 800) : null
	};
}

async function readResponsePrefix(res: Response, maxBytes: number): Promise<string> {
	const reader = res.body?.getReader();
	if (!reader) {
		const t = await res.text();
		return t.slice(0, maxBytes);
	}
	const decoder = new TextDecoder('utf-8', { fatal: false });
	let out = '';
	let received = 0;
	try {
		while (received < maxBytes) {
			const { done, value } = await reader.read();
			if (done) break;
			received += value.byteLength;
			out += decoder.decode(value, { stream: true });
			const low = out.toLowerCase();
			if (low.includes('</head>')) break;
			if (out.length >= maxBytes) break;
		}
	} finally {
		await reader.cancel().catch(() => {});
	}
	out += decoder.decode();
	return out.slice(0, maxBytes);
}

/**
 * Best-effort title + description from remote HTML (Open Graph / Twitter / classic meta).
 * Returns nulls when fetch fails, body is not HTML, or tags are missing.
 */
export async function fetchUrlSeo(answerUrl: string): Promise<UrlSeoSnippet> {
	const parsed = parseGlopAnswerUrl(answerUrl);
	if (!parsed || isBlockedSeoFetchHostname(parsed.hostname)) {
		return { title: null, description: null };
	}

	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
	try {
		const res = await fetch(parsed.href, {
			method: 'GET',
			signal: ctrl.signal,
			redirect: 'follow',
			headers: {
				Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
				'User-Agent': 'GloopGlopSearchBot/1.0 (+https://gloopglop.com/search)',
				'Accept-Language': 'en-US,en;q=0.9'
			}
		});

		const ct = res.headers.get('content-type')?.toLowerCase() ?? '';
		if (!res.ok || (!ct.includes('text/html') && !ct.includes('application/xhtml'))) {
			return { title: null, description: null };
		}

		const prefix = await readResponsePrefix(res, READ_MAX_BYTES);
		return extractSeoFromHtml(prefix);
	} catch {
		return { title: null, description: null };
	} finally {
		clearTimeout(timer);
	}
}

/** Fetch SEO for many URLs with a small concurrency cap (subrequest / latency control). */
export async function fetchSeoForUrls(urls: string[], concurrency = 4): Promise<Record<string, UrlSeoSnippet>> {
	const unique = [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
	const out: Record<string, UrlSeoSnippet> = {};
	for (let i = 0; i < unique.length; i += concurrency) {
		const slice = unique.slice(i, i + concurrency);
		const settled = await Promise.all(slice.map(async (u) => [u, await fetchUrlSeo(u)] as const));
		for (const [u, seo] of settled) {
			out[u] = seo;
		}
	}
	return out;
}
