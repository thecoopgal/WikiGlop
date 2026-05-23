import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertGloopglopUploadSite } from '$lib/server/upload-gate';
import {
	exchangeGoogleCode,
	fetchGoogleUserInfo,
	isGoogleOAuthConfigured,
	linkBrowserToGoogle,
	upsertGoogleAccount
} from '$lib/server/google-oauth';
import {
	GOOGLE_SESSION_COOKIE,
	newGoogleSessionId,
	OAUTH_STATE_COOKIE,
	signGoogleSessionCookie,
	verifyOAuthState
} from '$lib/server/upload-session-cookie';

export const GET: RequestHandler = async ({ url, locals, platform, cookies }) => {
	assertGloopglopUploadSite(locals.site);

	if (!isGoogleOAuthConfigured(platform)) {
		throw error(503, 'Google sign-in is not configured');
	}

	const code = url.searchParams.get('code');
	const stateParam = url.searchParams.get('state');
	const oauthError = url.searchParams.get('error');

	if (oauthError) {
		throw error(400, `Google sign-in was cancelled (${oauthError})`);
	}
	if (!code) throw error(400, 'Missing authorization code');

	const cookieState = cookies.get(OAUTH_STATE_COOKIE);
	if (!stateParam || stateParam !== cookieState) {
		throw error(400, 'Invalid OAuth state');
	}

	const statePayload = await verifyOAuthState(platform, cookieState);
	if (!statePayload) throw error(400, 'Invalid OAuth state signature');

	let returnTo = '/upload';
	try {
		const parsed = JSON.parse(statePayload) as { returnTo?: string };
		if (
			typeof parsed.returnTo === 'string' &&
			parsed.returnTo.startsWith('/') &&
			!parsed.returnTo.startsWith('//')
		) {
			returnTo = parsed.returnTo;
		}
	} catch {
		/* use default */
	}

	const tokens = await exchangeGoogleCode(platform, code);
	const user = await fetchGoogleUserInfo(tokens.access_token);

	await upsertGoogleAccount({
		platform,
		googleSub: user.sub,
		email: user.email ?? null,
		accessToken: tokens.access_token,
		refreshToken: tokens.refresh_token ?? null,
		expiresInSec: tokens.expires_in,
		scopes: tokens.scope ?? ''
	});

	const sessionId = newGoogleSessionId();
	await linkBrowserToGoogle({ platform, sessionId, googleSub: user.sub });

	const secure = url.protocol === 'https:';
	const signedSession = await signGoogleSessionCookie(platform, sessionId);

	cookies.set(GOOGLE_SESSION_COOKIE, signedSession, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: 60 * 60 * 24 * 90
	});
	cookies.delete(OAUTH_STATE_COOKIE, { path: '/' });

	redirect(302, `${returnTo}?google=connected`);
};
