import { canonicalOriginForSite } from '$lib/server/content';
import { getAllSites, resolveSiteByHostname, resolveSiteForGloopGgPath, resolveSiteById } from '$lib/server/sites';
import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';

const GLOOP_GG_APEX = new Set(['gloop.gg', 'www.gloop.gg']);
const GLOOPGLOP_HOST_RE = /(^|\.)gloopglop\.com$/i;

export const handle: Handle = async ({ event, resolve }) => {
	const hostname = event.url.hostname;
	if (hostname) {
		const hn = hostname.trim().toLowerCase();
		const pathname = event.url.pathname;
		const segments = pathname.split('/').filter(Boolean);

		let site: Awaited<ReturnType<typeof resolveSiteByHostname>> = null;

		if (GLOOP_GG_APEX.has(hn)) {
			if (segments.length === 0) {
				site = await resolveSiteById('gloopglop');
			} else {
				site = await resolveSiteForGloopGgPath(segments[0]);
				if (site) {
					const origin = canonicalOriginForSite(site, event.url);
					if (origin) {
						const rest = segments.slice(1);
						const path =
							rest.length > 0 ? `/${rest.map((s) => encodeURIComponent(s)).join('/')}` : '/';
						const destination = `${origin}${path}${event.url.search}`;
						return Response.redirect(destination, 301);
					}
				}
				event.locals.gloopGgPageSlugParts = segments.slice(1);
			}
		} else {
			site = await resolveSiteByHostname(hostname);
			// Canonicalize legacy *.gloopglop.com hosts to *.gloop.gg for brand consistency.
			if (site && GLOOPGLOP_HOST_RE.test(hn)) {
				const origin = canonicalOriginForSite(site, event.url);
				if (origin) {
					try {
						const target = new URL(origin);
						if (target.host.toLowerCase() !== event.url.host.toLowerCase()) {
							return Response.redirect(`${origin}${event.url.pathname}${event.url.search}`, 301);
						}
					} catch {
						// Ignore malformed origin and continue normal resolution.
					}
				}
			}
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

