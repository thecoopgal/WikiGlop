import type { PageServerLoad } from './$types';
import {
	getLinkedGoogleAccountForSession,
	isGoogleOAuthConfigured
} from '$lib/server/google-oauth';
import {
	GOOGLE_SESSION_COOKIE,
	verifyGoogleSessionCookie
} from '$lib/server/upload-session-cookie';

export const load: PageServerLoad = async ({ platform, cookies, url }) => {
	const sessionId = await verifyGoogleSessionCookie(
		platform,
		cookies.get(GOOGLE_SESSION_COOKIE)
	);
	const linked = await getLinkedGoogleAccountForSession({ platform, sessionId });
	const googleConnected = url.searchParams.get('google') === 'connected' || !!linked;

	return {
		google: {
			connected: googleConnected,
			email: linked?.email ?? null,
			configured: isGoogleOAuthConfigured(platform)
		}
	};
};
