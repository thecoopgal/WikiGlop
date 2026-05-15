import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { expandCreatorLinksShortcuts, listCreatorPagesAcrossSites, loadAllModals, loadPageYaml } from '$lib/server/content';
import { scheduleGloopglopPageGlopIngest } from '$lib/server/glop-page-ingest';
import { isMeNotificationsHost } from '$lib/server/me-host';

export const load: PageServerLoad = async ({ locals, url, platform }) => {
	const site = locals.site;
	if (!site) {
		throw error(404, 'Site not found for this hostname.');
	}

	if (isMeNotificationsHost(url.hostname)) {
		return {
			hub: 'creator_notifications' as const,
			site,
			creatorPages: await listCreatorPagesAcrossSites()
		};
	}

	const page = await loadPageYaml(site, []);
	if (!page) {
		throw error(404, 'Page not found.');
	}
	const hydratedPage = await expandCreatorLinksShortcuts(site, page, url);
	scheduleGloopglopPageGlopIngest({ platform, requestUrl: url, site, page: hydratedPage });

	const modals = await loadAllModals(site);
	return { site, page: hydratedPage, modals, initialModalId: null, formSlugParts: [] as string[] };
};

