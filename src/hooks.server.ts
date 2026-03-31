import { getAllSites, resolveSiteByHostname } from '$lib/server/sites';
import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';

export const handle: Handle = async ({ event, resolve }) => {
	const hostname = event.url.hostname;
	if (hostname) {
		let site = await resolveSiteByHostname(hostname);
		// Dev convenience: if only one site is configured, allow localhost testing.
		if (!site && (dev || process.env.NODE_ENV === 'development')) {
			const all = await getAllSites();
			if (all.length === 1) site = all[0];
		}
		event.locals.site = site;
	}

	return resolve(event);
};

