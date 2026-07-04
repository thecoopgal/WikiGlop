import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { assertGloopglopAuthSite } from '$lib/server/auth-gate';
import { formFromPage } from '$lib/content-page-edit';
import {
	getContentPageDraft,
	getContentSiteById,
	getSiteMemberRole,
	isContentStoreSchemaError,
	loadContentPage,
	roleCanEdit
} from '$lib/server/content-store';

export const load: PageServerLoad = async ({ locals, platform, params, url }) => {
	assertGloopglopAuthSite(locals.site);

	if (!locals.user) {
		throw redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	}

	const siteId = params.siteId?.trim().toLowerCase() ?? '';
	if (!siteId) throw error(404, 'Page not found');

	try {
		const site = await getContentSiteById(platform, siteId);
		if (!site) throw error(404, 'Page not found');

		const role = await getSiteMemberRole(platform, siteId, locals.user.id);
		if (!roleCanEdit(role, locals.user.role === 'admin')) {
			throw error(403, 'You do not have permission to edit this page.');
		}

		const publishedPage = await loadContentPage(platform, siteId, []);
		if (!publishedPage) throw error(404, 'Page content not found');

		const publishedForm = formFromPage(publishedPage);
		if (!publishedForm) throw error(400, 'This page type cannot be edited yet.');

		const publishedThemeOverrides = site.theme?.overrides ?? null;

		let draft = null;
		try {
			draft = await getContentPageDraft(platform, siteId, 'index');
		} catch (e) {
			if (!isContentStoreSchemaError(e)) throw e;
		}

		const activePage = draft?.page ?? publishedPage;
		const activeForm = formFromPage(activePage);
		if (!activeForm) throw error(400, 'This page type cannot be edited yet.');

		const activeThemeOverrides = draft ? draft.themeOverrides : publishedThemeOverrides;

		const themeMode =
			site.theme?.mode === 'dark' || site.theme?.mode === 'light'
				? site.theme.mode
				: site.theme?.preset === 'dark'
					? 'dark'
					: 'light';

		return {
			site: locals.site,
			user: locals.user,
			siteId,
			siteName: site.name ?? siteId,
			themeMode,
			role,
			hasDraft: draft != null,
			draftUpdatedAt: draft?.updatedAt ?? null,
			form: activeForm,
			page: activePage,
			themeOverrides: activeThemeOverrides,
			publishedForm,
			publishedPage,
			publishedThemeOverrides
		};
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		if (isContentStoreSchemaError(e)) {
			throw error(503, 'Content store needs migration 0016/0017/0018.');
		}
		throw e;
	}
};
