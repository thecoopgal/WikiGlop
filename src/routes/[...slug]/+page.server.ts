import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { expandCreatorLinksShortcuts, loadAllModals, loadPageYaml } from '$lib/server/content';
import { scheduleGloopglopPageGlopIngest } from '$lib/server/glop-page-ingest';

function normalizeSlugParts(slugParam: unknown): string[] {
	// In `[...slug]`, params.slug is usually a single string like "bylaws" or "a/b".
	const rawParts = Array.isArray(slugParam)
		? slugParam
		: typeof slugParam === 'string'
			? slugParam.split('/')
			: [];

	return rawParts
		.map((s) => (typeof s === 'string' ? s : ''))
		.filter(Boolean)
		.map((s) => {
			try {
				return decodeURIComponent(s);
			} catch {
				return s;
			}
		});
}

export const load: PageServerLoad = async ({ params, locals, url, platform }) => {
	const site = locals.site;
	if (!site) {
		throw error(404, 'Site not found for this hostname.');
	}

	const slugParts =
		locals.gloopGgPageSlugParts !== undefined
			? locals.gloopGgPageSlugParts
			: normalizeSlugParts(params.slug);
	if (slugParts.length > 1) {
		throw error(404, 'Nested pages are not supported yet.');
	}

	const modals = await loadAllModals(site);
	const page = await loadPageYaml(site, slugParts);
	if (page) {
		const hydratedPage = await expandCreatorLinksShortcuts(site, page, url);
		scheduleGloopglopPageGlopIngest({ platform, requestUrl: url, site, page: hydratedPage });
		return { site, page: hydratedPage, modals, initialModalId: null, formSlugParts: slugParts };
	}

	// Modal deep-link fallback: /{modalId} opens the modal on top of index page.
	if (slugParts.length === 1) {
		const modalId = slugParts[0];
		if (modals[modalId]) {
			const basePage = await loadPageYaml(site, []);
			if (!basePage) throw error(404, 'Base page not found.');
			const hydratedBasePage = await expandCreatorLinksShortcuts(site, basePage, url);
			scheduleGloopglopPageGlopIngest({ platform, requestUrl: url, site, page: hydratedBasePage });
			return {
				site,
				page: hydratedBasePage,
				modals,
				initialModalId: modalId,
				formSlugParts: [] as string[]
			};
		}
	}

	throw error(404, 'Page not found.');
};

