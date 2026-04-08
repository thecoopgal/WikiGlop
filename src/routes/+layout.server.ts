import { loadNotFoundPageForError } from '$lib/server/content';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	return {
		notFoundForError: await loadNotFoundPageForError(locals.site, url)
	};
};
