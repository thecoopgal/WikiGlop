/** Full search page with input focused and text selected. */
export const GLOOPGLOP_SEARCH_PAGE_FOCUS_HREF = '/search?focus=1';

export function gloopglopSearchPageHref(query = ''): string {
	const params = new URLSearchParams();
	const trimmed = query.trim();
	if (trimmed.length >= 2) params.set('q', trimmed);
	params.set('focus', '1');
	return `/search?${params.toString()}`;
}
