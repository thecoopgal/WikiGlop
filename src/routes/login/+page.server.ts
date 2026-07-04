import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { assertGloopglopAuthSite } from '$lib/server/auth-gate';

export const load: PageServerLoad = async ({ locals, url }) => {
	assertGloopglopAuthSite(locals.site);

	if (locals.user) {
		const next = url.searchParams.get('next');
		const dest =
			next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
		throw redirect(303, dest);
	}

	const next = url.searchParams.get('next');
	return {
		site: locals.site,
		next: next && next.startsWith('/') && !next.startsWith('//') ? next : null
	};
};
