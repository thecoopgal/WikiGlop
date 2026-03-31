import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { expandCreatorLinksShortcuts, loadAllModals, loadPageYaml } from '$lib/server/content';

export const load: PageServerLoad = async ({ locals, url }) => {
	const site = locals.site;
	if (!site) {
		throw error(404, 'Site not found for this hostname.');
	}

	const page = await loadPageYaml(site, []);
	if (!page) {
		throw error(404, 'Page not found.');
	}
	const hydratedPage = await expandCreatorLinksShortcuts(site, page, url);

	const modals = await loadAllModals(site);
	return { site, page: hydratedPage, modals, initialModalId: null };
};

