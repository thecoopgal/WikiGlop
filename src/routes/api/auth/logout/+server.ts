import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	SESSION_COOKIE,
	clearSessionCookie,
	revokeSessionByToken
} from '$lib/server/auth-session';

export const POST: RequestHandler = async ({ cookies, platform }) => {
	const token = cookies.get(SESSION_COOKIE);
	if (token) {
		try {
			await revokeSessionByToken(platform, token);
		} catch (e) {
			console.error('logout revoke failed:', e);
		}
	}
	clearSessionCookie(cookies);
	return json({ ok: true });
};
