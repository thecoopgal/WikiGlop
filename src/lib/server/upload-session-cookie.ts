import { getWorkerBindings } from '$lib/server/platform-env';

export const GOOGLE_SESSION_COOKIE = 'gg_google_session';

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 90;

function base64UrlEncode(bytes: Uint8Array): string {
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(s: string): Uint8Array {
	const padded = s.replace(/-/g, '+').replace(/_/g, '/');
	const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
	const binary = atob(padded + pad);
	const out = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
	return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
	const enc = new TextEncoder();
	return crypto.subtle.importKey(
		'raw',
		enc.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify']
	);
}

async function signPayload(secret: string, payload: string): Promise<string> {
	const key = await hmacKey(secret);
	const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
	return base64UrlEncode(new Uint8Array(sig));
}

function sessionSecret(platform: App.Platform | undefined): string {
	const bindings = getWorkerBindings(platform);
	const secret = bindings.UPLOAD_SESSION_SECRET;
	if (typeof secret === 'string' && secret.trim().length >= 16) return secret.trim();
	if (typeof process !== 'undefined' && process.env?.UPLOAD_SESSION_SECRET?.trim()) {
		return process.env.UPLOAD_SESSION_SECRET.trim();
	}
	// Local dev fallback — set UPLOAD_SESSION_SECRET in production.
	return 'dev-upload-session-secret-change-me';
}

export function newGoogleSessionId(): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	return base64UrlEncode(bytes);
}

/** Signed cookie value: sessionId.signature */
export async function signGoogleSessionCookie(
	platform: App.Platform | undefined,
	sessionId: string
): Promise<string> {
	const sig = await signPayload(sessionSecret(platform), sessionId);
	return `${sessionId}.${sig}`;
}

export async function verifyGoogleSessionCookie(
	platform: App.Platform | undefined,
	cookieValue: string | undefined
): Promise<string | null> {
	if (!cookieValue?.trim()) return null;
	const dot = cookieValue.lastIndexOf('.');
	if (dot <= 0) return null;
	const sessionId = cookieValue.slice(0, dot);
	const sig = cookieValue.slice(dot + 1);
	const expected = await signPayload(sessionSecret(platform), sessionId);
	if (sig.length !== expected.length) return null;
	let diff = 0;
	for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
	return diff === 0 ? sessionId : null;
}

export function googleSessionCookieHeader(
	value: string,
	secure: boolean
): string {
	const parts = [
		`${GOOGLE_SESSION_COOKIE}=${encodeURIComponent(value)}`,
		'Path=/',
		'HttpOnly',
		'SameSite=Lax',
		`Max-Age=${COOKIE_MAX_AGE_SEC}`
	];
	if (secure) parts.push('Secure');
	return parts.join('; ');
}

export function clearGoogleSessionCookieHeader(secure: boolean): string {
	const parts = [`${GOOGLE_SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
	if (secure) parts.push('Secure');
	return parts.join('; ');
}

/** OAuth CSRF state stored briefly in a separate cookie. */
export const OAUTH_STATE_COOKIE = 'gg_google_oauth_state';

export async function signOAuthState(
	platform: App.Platform | undefined,
	payload: string
): Promise<string> {
	const sig = await signPayload(sessionSecret(platform), payload);
	return `${base64UrlEncode(new TextEncoder().encode(payload))}.${sig}`;
}

export async function verifyOAuthState(
	platform: App.Platform | undefined,
	cookieValue: string | undefined
): Promise<string | null> {
	if (!cookieValue?.trim()) return null;
	const dot = cookieValue.lastIndexOf('.');
	if (dot <= 0) return null;
	const payloadB64 = cookieValue.slice(0, dot);
	const sig = cookieValue.slice(dot + 1);
	try {
		const payload = new TextDecoder().decode(base64UrlDecode(payloadB64));
		const expected = await signPayload(sessionSecret(platform), payload);
		if (sig.length !== expected.length) return null;
		let diff = 0;
		for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
		return diff === 0 ? payload : null;
	} catch {
		return null;
	}
}

export function oauthStateCookieHeader(value: string, secure: boolean): string {
	const parts = [
		`${OAUTH_STATE_COOKIE}=${encodeURIComponent(value)}`,
		'Path=/',
		'HttpOnly',
		'SameSite=Lax',
		'Max-Age=600'
	];
	if (secure) parts.push('Secure');
	return parts.join('; ');
}

export function clearOAuthStateCookieHeader(secure: boolean): string {
	const parts = [`${OAUTH_STATE_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
	if (secure) parts.push('Secure');
	return parts.join('; ');
}
