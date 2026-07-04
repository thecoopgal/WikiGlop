import { loadNotFoundPageForError } from '$lib/server/content';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url, platform }) => {
	return {
		site: locals.site,
		user: locals.user ?? null,
		notFoundForError: await loadNotFoundPageForError(locals.site, url, platform)
	};
};
