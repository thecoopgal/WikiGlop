import { canonicalOriginForSite } from '$lib/server/content';
import { isMeNotificationsHost } from '$lib/server/me-host';
import { getAllSites, resolveSiteByHostname, resolveSiteForGloopGgPath } from '$lib/server/sites';
import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';

const GLOOP_GG_APEX = new Set(['gloop.gg', 'www.gloop.gg']);

/** Canonical GloopGlop host for apex gloop.gg traffic (platform pages, not creator short links). */
function gloopglopOriginForGloopGgApex(hostname: string): string {
	return hostname === 'www.gloop.gg' ? 'https://www.gloopglop.com' : 'https://gloopglop.com';
}

export const handle: Handle = async ({ event, resolve }) => {
	const hostname = event.url.hostname;
	if (hostname) {
		const hn = hostname.trim().toLowerCase();
		const pathname = event.url.pathname;
		const segments = pathname.split('/').filter(Boolean);
		if (isMeNotificationsHost(hn) && pathname === '/me') {
			return Response.redirect(`${event.url.origin}/${event.url.search}`, 302);
		}

		let site: Awaited<ReturnType<typeof resolveSiteByHostname>> = null;

		if (GLOOP_GG_APEX.has(hn)) {
			const platformOrigin = gloopglopOriginForGloopGgApex(hn);

			if (segments.length === 0) {
				return Response.redirect(`${platformOrigin}/${event.url.search}`, 301);
			}

			const creatorSite = await resolveSiteForGloopGgPath(segments[0], event.platform);
			if (creatorSite) {
				const origin = canonicalOriginForSite(creatorSite, event.url);
				if (origin) {
					const rest = segments.slice(1);
					const path =
						rest.length > 0 ? `/${rest.map((s) => encodeURIComponent(s)).join('/')}` : '/';
					const destination = `${origin}${path}${event.url.search}`;
					return Response.redirect(destination, 301);
				}
			}

			// Not a creator short slug — send platform paths (/creators, /search, …) to gloopglop.com.
			const destination = `${platformOrigin}${pathname}${event.url.search}`;
			return Response.redirect(destination, 301);
		} else {
			site = await resolveSiteByHostname(hostname, event.platform);
		}

		const isNodeDev =
			typeof process !== 'undefined' &&
			typeof process.env?.NODE_ENV === 'string' &&
			process.env.NODE_ENV === 'development';
		// Dev convenience: if only one site is configured, allow localhost testing.
		if (!site && (dev || isNodeDev)) {
			const all = await getAllSites();
			if (all.length === 1) site = all[0];
		}
		event.locals.site = site;
	}

	return resolve(event);
};

