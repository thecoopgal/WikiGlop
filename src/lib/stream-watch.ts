/** Cloudflare Stream iframe embed (works with any account's video uid). */
export function streamIframeSrc(streamUid: string): string {
	return `https://iframe.videodelivery.net/${encodeURIComponent(streamUid)}`;
}

/** Default Stream thumbnail URL when we have not stored one in D1. */
export function streamThumbnailSrc(streamUid: string): string {
	return `https://videodelivery.net/${encodeURIComponent(streamUid)}/thumbnails/thumbnail.jpg`;
}
