import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

function safeDisplayPath(raw: string | null): string | null {
	if (!raw || typeof raw !== 'string') return null;
	const t = raw.trim();
	if (!t.startsWith('/') || t.includes('..')) return null;
	return t.length > 200 ? `${t.slice(0, 200)}…` : t;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const site = locals.site;
	if (!site) {
		throw error(404, 'Site not found for this hostname.');
	}

	const fromPath = safeDisplayPath(url.searchParams.get('from'));

	return { site, fromPath };
};
