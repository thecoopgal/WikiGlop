import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertGloopglopUploadSite } from '$lib/server/upload-gate';
import {
	getLinkedGoogleAccountForSession,
	isGoogleOAuthConfigured
} from '$lib/server/google-oauth';
import {
	GOOGLE_SESSION_COOKIE,
	verifyGoogleSessionCookie
} from '$lib/server/upload-session-cookie';

export const GET: RequestHandler = async ({ locals, platform, cookies }) => {
	assertGloopglopUploadSite(locals.site);

	const sessionId = await verifyGoogleSessionCookie(
		platform,
		cookies.get(GOOGLE_SESSION_COOKIE)
	);
	const linked = await getLinkedGoogleAccountForSession({ platform, sessionId });
	const configured = isGoogleOAuthConfigured(platform);

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
				id: 'youtube',
				label: 'YouTube',
				connected: !!linked,
				accountEmail: linked?.email ?? null,
				configured,
				available: configured
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
		],
		google: {
			connected: !!linked,
			email: linked?.email ?? null,
			configured
		}
	});
};
