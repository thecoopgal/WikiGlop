const YOUTUBE_VIDEO_ID = /^[\w-]{6,}$/;

function normalizeYouTubeHost(hostname: string): string {
	return hostname.trim().toLowerCase().replace(/^www\./, '');
}

function isYouTubeHost(hostname: string): boolean {
	const host = normalizeYouTubeHost(hostname);
	return host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be';
}

/** Returns a YouTube video id when the URL points at a single video (not a channel). */
export function parseYouTubeVideoId(url: string): string | null {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}

	if (!isYouTubeHost(parsed.hostname)) return null;

	const host = normalizeYouTubeHost(parsed.hostname);

	if (host === 'youtu.be') {
		const id = parsed.pathname.slice(1).split('/').filter(Boolean)[0] ?? '';
		return YOUTUBE_VIDEO_ID.test(id) ? id : null;
	}

	if (parsed.pathname === '/watch') {
		const id = parsed.searchParams.get('v')?.trim() ?? '';
		return YOUTUBE_VIDEO_ID.test(id) ? id : null;
	}

	if (parsed.pathname === '/share') {
		const id = parsed.searchParams.get('v')?.trim() ?? '';
		if (YOUTUBE_VIDEO_ID.test(id)) return id;
		const embedded = parsed.searchParams.get('url')?.trim();
		if (embedded) return parseYouTubeVideoId(embedded);
		return null;
	}

	const pathMatch = /^\/(?:embed|v|shorts|live)\/([^/?#]+)/.exec(parsed.pathname);
	if (pathMatch) {
		const id = pathMatch[1];
		return YOUTUBE_VIDEO_ID.test(id) ? id : null;
	}

	return null;
}

export function youtubeEmbedSrc(videoId: string): string {
	return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
}
