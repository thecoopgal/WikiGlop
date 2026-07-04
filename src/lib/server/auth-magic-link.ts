import { getDbBinding } from '$lib/server/platform-env';
import { newId, normalizeEmail, randomTokenHex, sha256Hex } from '$lib/server/auth-crypto';
import {
	touchUserLastLogin,
	upsertUserByEmail,
	type AuthUser
} from '$lib/server/auth-users';
import { createSession } from '$lib/server/auth-session';
import type { Cookies } from '@sveltejs/kit';

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
/** Soft cap to limit abuse; silent on the client (same success message). */
const MAX_TOKENS_PER_EMAIL_PER_HOUR = 15;

export type CreateMagicLinkResult =
	| { ok: true; token: string; emailNormalized: string }
	| { ok: false; reason: 'invalid_email' | 'rate_limited' };

export async function createMagicLinkToken(
	platform: App.Platform | undefined,
	emailRaw: string,
	requestIp: string | null
): Promise<CreateMagicLinkResult> {
	const emailNormalized = normalizeEmail(emailRaw);
	if (!emailNormalized) return { ok: false, reason: 'invalid_email' };

	const db = getDbBinding(platform);

	const recent = await db
		.prepare(
			`SELECT COUNT(*) AS cnt
       FROM magic_link_tokens
       WHERE email_normalized = ?
         AND created_at >= datetime('now', '-1 hour')`
		)
		.bind(emailNormalized)
		.first<{ cnt: number | bigint }>();

	const count = Number(recent?.cnt ?? 0);
	if (count >= MAX_TOKENS_PER_EMAIL_PER_HOUR) {
		return { ok: false, reason: 'rate_limited' };
	}

	const token = randomTokenHex(32);
	const tokenHash = await sha256Hex(token);
	const id = newId('mlt');
	const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS).toISOString();

	await db
		.prepare(
			`INSERT INTO magic_link_tokens (id, email_normalized, token_hash, expires_at, request_ip)
       VALUES (?, ?, ?, ?, ?)`
		)
		.bind(id, emailNormalized, tokenHash, expiresAt, requestIp)
		.run();

	return { ok: true, token, emailNormalized };
}

export type ConsumeMagicLinkResult =
	| { ok: true; user: AuthUser }
	| { ok: false; reason: 'invalid' | 'expired' | 'used' };

export async function consumeMagicLinkToken(
	platform: App.Platform | undefined,
	tokenRaw: string,
	cookies: Cookies
): Promise<ConsumeMagicLinkResult> {
	const token = tokenRaw.trim();
	if (!token || token.length < 32) return { ok: false, reason: 'invalid' };

	const db = getDbBinding(platform);
	const tokenHash = await sha256Hex(token);

	const row = await db
		.prepare(
			`SELECT id, email_normalized, expires_at, used_at
       FROM magic_link_tokens
       WHERE token_hash = ?
       LIMIT 1`
		)
		.bind(tokenHash)
		.first<{
			id: string;
			email_normalized: string;
			expires_at: string;
			used_at: string | null;
		}>();

	if (!row) return { ok: false, reason: 'invalid' };
	if (row.used_at) return { ok: false, reason: 'used' };

	const expiresMs = Date.parse(row.expires_at);
	if (!Number.isFinite(expiresMs) || expiresMs <= Date.now()) {
		return { ok: false, reason: 'expired' };
	}

	const marked = await db
		.prepare(
			`UPDATE magic_link_tokens
       SET used_at = datetime('now')
       WHERE id = ? AND used_at IS NULL`
		)
		.bind(row.id)
		.run();

	// Best-effort single-use; D1 run() meta varies by runtime.
	void marked;

	const user = await upsertUserByEmail(platform, row.email_normalized);
	await touchUserLastLogin(platform, user.id);
	await createSession(platform, user.id, cookies);

	return { ok: true, user };
}

export function buildMagicLinkUrl(origin: string, token: string, nextPath: string | null): string {
	const url = new URL('/auth/verify', origin);
	url.searchParams.set('token', token);
	if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) {
		url.searchParams.set('next', nextPath);
	}
	return url.toString();
}
