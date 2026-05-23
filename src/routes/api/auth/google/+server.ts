import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertGloopglopUploadSite } from '$lib/server/upload-gate';
import { buildGoogleAuthUrl, isGoogleOAuthConfigured } from '$lib/server/google-oauth';
import { OAUTH_STATE_COOKIE, signOAuthState } from '$lib/server/upload-session-cookie';

export const GET: RequestHandler = async ({ url, locals, platform, cookies }) => {
	assertGloopglopUploadSite(locals.site);

	if (!isGoogleOAuthConfigured(platform)) {
		throw error(
			503,
			'Google sign-in is not configured. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI.'
		);
	}

	const returnTo = url.searchParams.get('returnTo')?.trim() || '/upload';
	const safeReturn =
		returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/upload';
	const statePayload = JSON.stringify({ returnTo: safeReturn, nonce: crypto.randomUUID() });
	const signedState = await signOAuthState(platform, statePayload);
	const authUrl = buildGoogleAuthUrl(platform, signedState);
	const secure = url.protocol === 'https:';

	cookies.set(OAUTH_STATE_COOKIE, signedState, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: 600
	});

	redirect(302, authUrl);
};
