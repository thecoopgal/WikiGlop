import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { expandCreatorLinksShortcuts, loadAllModals, loadPageYaml } from '$lib/server/content';
import { isRatesdotcoopSite, loadCreditUnionProfileYaml } from '$lib/server/ratesdotcoop';

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

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const site = locals.site;
	if (!site) {
		throw error(404, 'Site not found for this hostname.');
	}

	const slugParts = normalizeSlugParts(params.slug);
	if (slugParts.length > 1) {
		throw error(404, 'Nested pages are not supported yet.');
	}

	const modals = await loadAllModals(site);
	const page = await loadPageYaml(site, slugParts);
	if (page) {
		const hydratedPage = await expandCreatorLinksShortcuts(site, page, url);
		return { site, page: hydratedPage, modals, initialModalId: null, formSlugParts: slugParts };
	}

	// Modal deep-link fallback: /{modalId} opens the modal on top of index page.
	if (slugParts.length === 1) {
		const modalId = slugParts[0];
		if (modals[modalId]) {
			const basePage = await loadPageYaml(site, []);
			if (!basePage) throw error(404, 'Base page not found.');
			const hydratedBasePage = await expandCreatorLinksShortcuts(site, basePage, url);
			return {
				site,
				page: hydratedBasePage,
				modals,
				initialModalId: modalId,
				formSlugParts: [] as string[]
			};
		}
	}

	// rates.coop: /{slug} credit union profile (filesystem YAML under profiles/, not pages/).
	if (slugParts.length === 1 && isRatesdotcoopSite(site)) {
		const cu = loadCreditUnionProfileYaml(site, slugParts[0]);
		if (cu) {
			const hydrated = await expandCreatorLinksShortcuts(site, cu, url);
			return { site, page: hydrated, modals, initialModalId: null, formSlugParts: slugParts };
		}
	}

	throw error(404, 'Page not found.');
};

