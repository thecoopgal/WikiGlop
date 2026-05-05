import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listCreatorPages } from '$lib/server/content';

export const load: PageServerLoad = async ({ locals }) => {
	const site = locals.site;
	if (!site) throw error(404, 'Site not found for this hostname.');

	return {
		site,
		creatorPages: await listCreatorPages(site)
	};
};
