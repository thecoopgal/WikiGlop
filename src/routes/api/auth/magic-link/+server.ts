import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendMagicLinkEmail } from '$lib/server/auth-email';
import { assertGloopglopAuthSite } from '$lib/server/auth-gate';
import {
	buildMagicLinkUrl,
	createMagicLinkToken
} from '$lib/server/auth-magic-link';
import { findUserByNormalizedEmail } from '$lib/server/auth-users';

const SUCCESS_MESSAGE = 'We sent a secure link. Open it to continue.';

export const POST: RequestHandler = async ({ request, locals, platform, url, getClientAddress }) => {
	assertGloopglopAuthSite(locals.site);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}
	if (!body || typeof body !== 'object') throw error(400, 'Invalid body');

	const emailRaw = typeof (body as { email?: unknown }).email === 'string'
		? (body as { email: string }).email
		: '';
	const nextRaw =
		typeof (body as { next?: unknown }).next === 'string' ? (body as { next: string }).next : null;

	let requestIp: string | null = null;
	try {
		requestIp = getClientAddress();
	} catch {
		requestIp = null;
	}

	try {
		const created = await createMagicLinkToken(platform, emailRaw, requestIp);
		if (created.ok === false) {
			if (created.reason === 'invalid_email') {
				throw error(400, 'Enter a valid email address.');
			}
			// Rate limited: still return success to avoid enumeration / lockout signals.
			console.warn('[auth] magic-link rate limited; email not sent');
			return json({ ok: true, message: SUCCESS_MESSAGE });
		}

		const magicLinkUrl = buildMagicLinkUrl(url.origin, created.token, nextRaw);
		const existingUser = await findUserByNormalizedEmail(platform, created.emailNormalized);
		const sent = await sendMagicLinkEmail(platform, {
			to: created.emailNormalized,
			magicLinkUrl,
			isExistingUser: existingUser != null
		});
		if (!sent.sent && !sent.devLogged) {
			console.error('[auth] magic-link email failed to send');
			throw error(503, 'Login email is temporarily unavailable.');
		}
		if (sent.devLogged) {
			console.info('[auth] magic-link logged to console (no EMAIL binding)');
		}

		return json({ ok: true, message: SUCCESS_MESSAGE });
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		console.error('magic-link POST failed:', e);
		throw error(503, 'Login email is temporarily unavailable.');
	}
};
