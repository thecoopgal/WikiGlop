import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { assertGloopglopAuthSite } from '$lib/server/auth-gate';
import { consumeMagicLinkToken } from '$lib/server/auth-magic-link';

function safeNext(raw: string | null): string {
	if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
	return '/';
}

export const load: PageServerLoad = async ({ locals, url, platform, cookies }) => {
	assertGloopglopAuthSite(locals.site);

	const token = url.searchParams.get('token')?.trim() ?? '';
	const next = safeNext(url.searchParams.get('next'));

	if (!token) {
		return { status: 'invalid' as const, next };
	}

	// Already signed in — ignore token and go.
	if (locals.user) {
		throw redirect(303, next);
	}

	try {
		const result = await consumeMagicLinkToken(platform, token, cookies);
		if (result.ok) {
			throw redirect(303, next);
		}
		return { status: result.reason, next };
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e && 'location' in e) throw e;
		console.error('auth verify failed:', e);
		return { status: 'invalid' as const, next };
	}
};
