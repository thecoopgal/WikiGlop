import { error } from '@sveltejs/kit';
import type { ResolvedSite } from '$lib/server/sites';
import { GLOOPGLOP_SITE_ID } from '$lib/server/upload-gate';
import type { AuthUser } from '$lib/server/auth-users';

/** Auth UI and APIs are platform-only (gloopglop hosts / localhost platform). */
export function assertGloopglopAuthSite(site: ResolvedSite | null | undefined): ResolvedSite {
	if (!site || site.siteId !== GLOOPGLOP_SITE_ID) {
		throw error(404, 'Not found');
	}
	return site;
}

export function requireUser(user: AuthUser | null | undefined): AuthUser {
	if (!user) throw error(401, 'Sign in required');
	return user;
}

export function requireAdmin(user: AuthUser | null | undefined): AuthUser {
	const u = requireUser(user);
	if (u.role !== 'admin') throw error(403, 'Admin required');
	return u;
}
