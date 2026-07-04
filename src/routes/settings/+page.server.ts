import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const GLOOPGLOP_SITE_ID = 'gloopglop';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.site?.siteId !== GLOOPGLOP_SITE_ID) {
		throw error(404, 'Not found');
	}
	return { site: locals.site, user: locals.user ?? null };
};
