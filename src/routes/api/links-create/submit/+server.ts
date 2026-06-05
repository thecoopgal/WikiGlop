import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendFormNotificationEmail } from '$lib/server/send-form-email';
import { env } from '$env/dynamic/private';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function submitEmailTo(): string | null {
	const configured = env.LINKS_CREATE_SUBMIT_EMAIL?.trim();
	if (configured && EMAIL_RE.test(configured)) return configured;
	return null;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const site = locals.site;
	if (!site) throw error(404, 'Site not found');

	const sendTo = submitEmailTo();
	if (!sendTo) {
		return json(
			{
				ok: false,
				error:
					"Automated submission is not available yet, if you've made it this far, you should know what to do."
			},
			{ status: 503 }
		);
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	if (!body || typeof body !== 'object') throw error(400, 'Invalid body');
	const payload = body as Record<string, unknown>;

	const names = Array.isArray(payload.names)
		? payload.names.filter(
				(value): value is string => typeof value === 'string' && value.trim().length > 0
			)
		: [];
	const links = Array.isArray(payload.links) ? payload.links : [];
	const tagline = typeof payload.tagline === 'string' ? payload.tagline.trim() : '';
	const description = typeof payload.description === 'string' ? payload.description.trim() : '';
	const theme = typeof payload.theme === 'string' ? payload.theme.trim() : '';
	const hasProfilePicture = payload.hasProfilePicture === true;

	if (names.length === 0) {
		return json({ ok: false, error: 'At least one name is required.' }, { status: 400 });
	}

	const lines: string[] = [
		`Site: ${site.name ?? site.siteId}`,
		'New GloopGlop Links page submission',
		'',
		`Theme: ${theme || '(none)'}`,
		`Names: ${names.join(', ')}`,
		`Tagline: ${tagline || '(none)'}`,
		`Description: ${description || '(none)'}`,
		`Profile picture: ${hasProfilePicture ? 'Yes' : 'No'}`,
		'',
		'Links:'
	];

	if (links.length === 0) {
		lines.push('(none)');
	} else {
		for (const link of links) {
			if (!link || typeof link !== 'object') continue;
			const item = link as Record<string, unknown>;
			const label = typeof item.label === 'string' ? item.label : 'Link';
			const href = typeof item.href === 'string' ? item.href : '';
			const iconMode = typeof item.iconMode === 'string' ? item.iconMode : 'basic';
			lines.push(`- ${label}: ${href} (${iconMode})`);
		}
	}

	const pageColors = payload.pageColors;
	if (pageColors && typeof pageColors === 'object' && !Array.isArray(pageColors)) {
		lines.push('', 'Page colors:');
		for (const [key, value] of Object.entries(pageColors as Record<string, unknown>)) {
			if (typeof value === 'string' && value.trim()) {
				lines.push(`- ${key}: ${value.trim()}`);
			}
		}
	}

	const subject = `[${site.name ?? site.siteId}] New Links page: ${names[0]}`;
	const sent = await sendFormNotificationEmail({ to: sendTo, subject, text: lines.join('\n') });
	if (!sent.ok) {
		return json({ ok: false, error: sent.error }, { status: 503 });
	}

	return json({
		ok: true,
		message: 'Thanks — your page was submitted. We will review it soon.'
	});
};
