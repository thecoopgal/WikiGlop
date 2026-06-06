import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendFormNotificationEmail } from '$lib/server/send-form-email';
import {
	assertGloopglopUploadSite,
	GLOOPGLOP_SITE_ID
} from '$lib/server/upload-gate';
import {
	createLinksPageSubmission,
	creatorIdFromPrimaryName,
	isLinksSubmissionSchemaError,
	normalizeLinksClientKey,
	type LinksPageSubmissionPayload
} from '$lib/server/links-submissions';
import { env } from '$env/dynamic/private';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function submitEmailTo(): string | null {
	const configured = env.LINKS_CREATE_SUBMIT_EMAIL?.trim();
	if (configured && EMAIL_RE.test(configured)) return configured;
	return null;
}

function buildSubmissionPayload(body: Record<string, unknown>): LinksPageSubmissionPayload | null {
	const names = Array.isArray(body.names)
		? body.names.filter(
				(value): value is string => typeof value === 'string' && value.trim().length > 0
			)
		: [];
	if (names.length === 0) return null;

	const links = Array.isArray(body.links)
		? body.links
				.filter(
					(item): item is Record<string, unknown> =>
						typeof item === 'object' && item !== null
				)
				.map((item) => ({
					label: typeof item.label === 'string' ? item.label : '',
					href: typeof item.href === 'string' ? item.href : '',
					iconMode: typeof item.iconMode === 'string' ? item.iconMode : undefined
				}))
				.filter((item) => item.href.trim().length > 0)
		: [];

	const pageColors: Record<string, string> =
		body.pageColors && typeof body.pageColors === 'object' && !Array.isArray(body.pageColors)
			? Object.fromEntries(
					Object.entries(body.pageColors as Record<string, unknown>).filter(
						(entry): entry is [string, string] =>
							typeof entry[1] === 'string' && entry[1].trim().length > 0
					)
				)
			: {};

	const profilePicture =
		typeof body.profilePictureUrl === 'string' ? body.profilePictureUrl.trim() : '';
	const hasProfilePicture =
		body.hasProfilePicture === true ||
		(/^https?:\/\//i.test(profilePicture) ?? false);

	return {
		theme: typeof body.theme === 'string' ? body.theme.trim() || null : null,
		names,
		tagline: typeof body.tagline === 'string' ? body.tagline.trim() : '',
		description: typeof body.description === 'string' ? body.description.trim() : '',
		links,
		hasProfilePicture,
		profilePictureUrl: /^https?:\/\//i.test(profilePicture) ? profilePicture : null,
		pageColors,
		shareIconVariant:
			body.shareIconVariant === 'dark' || body.shareIconVariant === 'light'
				? body.shareIconVariant
				: undefined,
		siteThemeMode:
			body.siteThemeMode === 'dark' || body.siteThemeMode === 'light'
				? body.siteThemeMode
				: undefined
	};
}

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const site = assertGloopglopUploadSite(locals.site);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	if (!body || typeof body !== 'object') throw error(400, 'Invalid body');
	const payload = body as Record<string, unknown>;

	const submissionPayload = buildSubmissionPayload(payload);
	if (!submissionPayload) {
		return json({ ok: false, error: 'At least one name is required.' }, { status: 400 });
	}

	const clientKey = normalizeLinksClientKey(payload.clientKey);
	const primaryName = submissionPayload.names[0]?.trim() ?? 'Creator';
	const creatorId = creatorIdFromPrimaryName(primaryName);

	let submissionId: string;
	try {
		const created = await createLinksPageSubmission({
			platform,
			siteId: GLOOPGLOP_SITE_ID,
			clientKey,
			displayName: primaryName,
			creatorId,
			payload: submissionPayload
		});
		submissionId = created.id;
	} catch (e) {
		if (isLinksSubmissionSchemaError(e)) {
			return json(
				{
					ok: false,
					error: 'Links submissions database needs migration 0013. Run npm run db:migrate:local or db:migrate:remote.'
				},
				{ status: 503 }
			);
		}
		throw e;
	}

	const sendTo = submitEmailTo();
	if (sendTo) {
		const lines: string[] = [
			`Site: ${site.name ?? site.siteId}`,
			'New GloopGlop Links page submission',
			`Submission id: ${submissionId}`,
			'',
			`Theme: ${submissionPayload.theme || '(none)'}`,
			`Names: ${submissionPayload.names.join(', ')}`,
			`Tagline: ${submissionPayload.tagline || '(none)'}`,
			`Description: ${submissionPayload.description || '(none)'}`,
			`Profile picture: ${submissionPayload.hasProfilePicture ? 'Yes' : 'No'}`,
			'',
			'Links:'
		];

		if (submissionPayload.links.length === 0) {
			lines.push('(none)');
		} else {
			for (const link of submissionPayload.links) {
				lines.push(`- ${link.label}: ${link.href} (${link.iconMode ?? 'basic'})`);
			}
		}

		if (Object.keys(submissionPayload.pageColors).length > 0) {
			lines.push('', 'Page colors:');
			for (const [key, value] of Object.entries(submissionPayload.pageColors)) {
				lines.push(`- ${key}: ${value}`);
			}
		}

		const subject = `[${site.name ?? site.siteId}] New Links page: ${primaryName}`;
		await sendFormNotificationEmail({ to: sendTo, subject, text: lines.join('\n') });
	}

	return json({
		ok: true,
		submissionId,
		message: 'Thanks — your page was submitted. We will review it soon.'
	});
};
