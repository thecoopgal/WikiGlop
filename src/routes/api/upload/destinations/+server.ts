import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertGloopglopUploadSite } from '$lib/server/upload-gate';

export const GET: RequestHandler = async ({ locals }) => {
	assertGloopglopUploadSite(locals.site);

	return json({
		destinations: [
			{
				id: 'gloopglop',
				label: 'GloopGlop',
				connected: true,
				accountEmail: null,
				configured: true,
				available: true
			},
			{
				id: 'tiktok',
				label: 'TikTok',
				connected: false,
				accountEmail: null,
				configured: false,
				available: false,
				comingSoon: true
			}
		]
	});
};
