import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { getDbBinding } from '$lib/server/platform-env';
import { newId, randomTokenHex, sha256Hex } from '$lib/server/auth-crypto';
import { findUserById, type AuthUser } from '$lib/server/auth-users';

export const SESSION_COOKIE = 'gg_session';
const SESSION_DAYS = 30;

function sessionMaxAgeSeconds(): number {
	return SESSION_DAYS * 24 * 60 * 60;
}

function cookieOptions(maxAge: number) {
	return {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax' as const,
		maxAge
	};
}

export async function createSession(
	platform: App.Platform | undefined,
	userId: string,
	cookies: Cookies
): Promise<void> {
	const db = getDbBinding(platform);
	const sessionId = newId('ses');
	const token = randomTokenHex(32);
	const tokenHash = await sha256Hex(token);
	const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds() * 1000).toISOString();

	await db
		.prepare(
			`INSERT INTO auth_sessions (id, user_id, token_hash, expires_at)
       VALUES (?, ?, ?, ?)`
		)
		.bind(sessionId, userId, tokenHash, expiresAt)
		.run();

	cookies.set(SESSION_COOKIE, token, cookieOptions(sessionMaxAgeSeconds()));
}

export async function revokeSessionByToken(
	platform: App.Platform | undefined,
	token: string
): Promise<void> {
	if (!token) return;
	const db = getDbBinding(platform);
	const tokenHash = await sha256Hex(token);
	await db
		.prepare(
			`UPDATE auth_sessions SET revoked_at = datetime('now')
       WHERE token_hash = ? AND revoked_at IS NULL`
		)
		.bind(tokenHash)
		.run();
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

export async function resolveUserFromSessionCookie(
	platform: App.Platform | undefined,
	cookies: Cookies
): Promise<AuthUser | null> {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return null;

	try {
		const db = getDbBinding(platform);
		const tokenHash = await sha256Hex(token);
		const row = await db
			.prepare(
				`SELECT user_id, expires_at, revoked_at
         FROM auth_sessions
         WHERE token_hash = ?
         LIMIT 1`
			)
			.bind(tokenHash)
			.first<{ user_id: string; expires_at: string; revoked_at: string | null }>();

		if (!row || row.revoked_at) {
			clearSessionCookie(cookies);
			return null;
		}

		const expiresMs = Date.parse(row.expires_at);
		if (!Number.isFinite(expiresMs) || expiresMs <= Date.now()) {
			clearSessionCookie(cookies);
			return null;
		}

		const user = await findUserById(platform, row.user_id);
		if (!user) {
			clearSessionCookie(cookies);
			return null;
		}
		return user;
	} catch {
		// DB unavailable (e.g. plain vite without bindings).
		return null;
	}
}
