import { getDbBinding, getWorkerBindings } from '$lib/server/platform-env';

export const YOUTUBE_UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.upload';
const OPENID_SCOPES = ['openid', 'email', 'profile'];

export const GOOGLE_OAUTH_SCOPES = [...OPENID_SCOPES, YOUTUBE_UPLOAD_SCOPE];

type GoogleTokenResponse = {
	access_token: string;
	expires_in: number;
	refresh_token?: string;
	scope?: string;
	token_type: string;
	id_token?: string;
};

type GoogleUserInfo = {
	sub: string;
	email?: string;
};

function oauthConfig(platform: App.Platform | undefined) {
	const bindings = getWorkerBindings(platform);
	const clientId = bindings.GOOGLE_OAUTH_CLIENT_ID;
	const clientSecret = bindings.GOOGLE_OAUTH_CLIENT_SECRET;
	const redirectUri = bindings.GOOGLE_OAUTH_REDIRECT_URI;
	if (typeof clientId !== 'string' || !clientId.trim()) {
		throw new Error('Google OAuth is not configured (GOOGLE_OAUTH_CLIENT_ID)');
	}
	if (typeof clientSecret !== 'string' || !clientSecret.trim()) {
		throw new Error('Google OAuth is not configured (GOOGLE_OAUTH_CLIENT_SECRET)');
	}
	if (typeof redirectUri !== 'string' || !redirectUri.trim()) {
		throw new Error('Google OAuth is not configured (GOOGLE_OAUTH_REDIRECT_URI)');
	}
	return {
		clientId: clientId.trim(),
		clientSecret: clientSecret.trim(),
		redirectUri: redirectUri.trim()
	};
}

export function buildGoogleAuthUrl(platform: App.Platform | undefined, state: string): string {
	const { clientId, redirectUri } = oauthConfig(platform);
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: GOOGLE_OAUTH_SCOPES.join(' '),
		access_type: 'offline',
		prompt: 'consent',
		state
	});
	return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(
	platform: App.Platform | undefined,
	code: string
): Promise<GoogleTokenResponse> {
	const { clientId, clientSecret, redirectUri } = oauthConfig(platform);
	const body = new URLSearchParams({
		code,
		client_id: clientId,
		client_secret: clientSecret,
		redirect_uri: redirectUri,
		grant_type: 'authorization_code'
	});
	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Google token exchange failed: ${text.slice(0, 200)}`);
	}
	return (await res.json()) as GoogleTokenResponse;
}

export async function refreshGoogleAccessToken(
	platform: App.Platform | undefined,
	refreshToken: string
): Promise<GoogleTokenResponse> {
	const { clientId, clientSecret } = oauthConfig(platform);
	const body = new URLSearchParams({
		refresh_token: refreshToken,
		client_id: clientId,
		client_secret: clientSecret,
		grant_type: 'refresh_token'
	});
	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Google token refresh failed: ${text.slice(0, 200)}`);
	}
	return (await res.json()) as GoogleTokenResponse;
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
	const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) {
		throw new Error('Could not load Google profile');
	}
	return (await res.json()) as GoogleUserInfo;
}

export async function upsertGoogleAccount(opts: {
	platform: App.Platform | undefined;
	googleSub: string;
	email: string | null;
	accessToken: string;
	refreshToken: string | null;
	expiresInSec: number;
	scopes: string;
}): Promise<void> {
	const db = getDbBinding(opts.platform);
	const expiresAt = Math.floor(Date.now() / 1000) + opts.expiresInSec;
	await db
		.prepare(
			`INSERT INTO google_oauth_accounts (google_sub, email, access_token, refresh_token, token_expires_at, scopes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(google_sub) DO UPDATE SET
         email = excluded.email,
         access_token = excluded.access_token,
         refresh_token = COALESCE(excluded.refresh_token, google_oauth_accounts.refresh_token),
         token_expires_at = excluded.token_expires_at,
         scopes = excluded.scopes,
         updated_at = datetime('now')`
		)
		.bind(
			opts.googleSub,
			opts.email,
			opts.accessToken,
			opts.refreshToken,
			expiresAt,
			opts.scopes
		)
		.run();
}

export async function linkBrowserToGoogle(opts: {
	platform: App.Platform | undefined;
	sessionId: string;
	googleSub: string;
}): Promise<void> {
	const db = getDbBinding(opts.platform);
	await db
		.prepare(
			`INSERT INTO google_oauth_browser_links (session_id, google_sub, created_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(session_id) DO UPDATE SET google_sub = excluded.google_sub`
		)
		.bind(opts.sessionId, opts.googleSub)
		.run();
}

export async function getGoogleSubForBrowserSession(opts: {
	platform: App.Platform | undefined;
	sessionId: string;
}): Promise<string | null> {
	const db = getDbBinding(opts.platform);
	const row = await db
		.prepare(`SELECT google_sub FROM google_oauth_browser_links WHERE session_id = ?`)
		.bind(opts.sessionId)
		.first<{ google_sub: string }>();
	return row?.google_sub ?? null;
}

export type GoogleAccountRow = {
	google_sub: string;
	email: string | null;
	access_token: string;
	refresh_token: string | null;
	token_expires_at: number | null;
};

export async function getGoogleAccount(
	platform: App.Platform | undefined,
	googleSub: string
): Promise<GoogleAccountRow | null> {
	const db = getDbBinding(platform);
	return db
		.prepare(
			`SELECT google_sub, email, access_token, refresh_token, token_expires_at
       FROM google_oauth_accounts WHERE google_sub = ?`
		)
		.bind(googleSub)
		.first<GoogleAccountRow>();
}

/** Returns a valid access token, refreshing when needed. */
export async function getValidGoogleAccessToken(
	platform: App.Platform | undefined,
	googleSub: string
): Promise<string> {
	const account = await getGoogleAccount(platform, googleSub);
	if (!account) throw new Error('Google account not linked');

	const now = Math.floor(Date.now() / 1000);
	const expires = account.token_expires_at ?? 0;
	if (expires - 60 > now) return account.access_token;

	if (!account.refresh_token) {
		throw new Error('Google session expired — sign in again');
	}

	const tokens = await refreshGoogleAccessToken(platform, account.refresh_token);
	await upsertGoogleAccount({
		platform,
		googleSub,
		email: account.email,
		accessToken: tokens.access_token,
		refreshToken: tokens.refresh_token ?? account.refresh_token,
		expiresInSec: tokens.expires_in,
		scopes: tokens.scope ?? YOUTUBE_UPLOAD_SCOPE
	});
	return tokens.access_token;
}

export async function getLinkedGoogleAccountForSession(opts: {
	platform: App.Platform | undefined;
	sessionId: string | null;
}): Promise<{ googleSub: string; email: string | null } | null> {
	if (!opts.sessionId) return null;
	const googleSub = await getGoogleSubForBrowserSession({
		platform: opts.platform,
		sessionId: opts.sessionId
	});
	if (!googleSub) return null;
	const account = await getGoogleAccount(opts.platform, googleSub);
	if (!account) return null;
	return { googleSub, email: account.email };
}

export function isGoogleOAuthConfigured(platform: App.Platform | undefined): boolean {
	try {
		oauthConfig(platform);
		return true;
	} catch {
		return false;
	}
}
