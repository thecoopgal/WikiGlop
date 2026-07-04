import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadModalYaml, loadPageYaml, type PageFormField, type PageYaml } from '$lib/server/content';
import { sendFormNotificationEmail } from '$lib/server/send-form-email';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isSafeSlugPart(s: string): boolean {
	return /^[a-z0-9][a-z0-9_-]*$/i.test(s);
}

function isSafeModalId(s: string): boolean {
	return /^[a-z0-9][a-z0-9_-]*$/i.test(s);
}

function formatFieldValue(field: PageFormField, value: string | boolean): string {
	if (field.type === 'checkbox') return value === true ? 'Yes' : 'No';
	return String(value ?? '');
}

function validateValues(
	fields: PageFormField[] | undefined,
	values: Record<string, unknown>
): { ok: true; normalized: Record<string, string | boolean> } | { ok: false; message: string } {
	if (!fields?.length) return { ok: false, message: 'No form fields configured.' };

	const normalized: Record<string, string | boolean> = {};
	for (const field of fields) {
		const raw = values[field.name];
		if (field.type === 'checkbox') {
			const b = raw === true || raw === 'true' || raw === 'on';
			if (field.required && !b) {
				return { ok: false, message: `Required: ${field.label ?? field.name}` };
			}
			normalized[field.name] = b;
			continue;
		}

		const str = raw == null ? '' : String(raw).trim();
		if (field.required && !str) {
			return { ok: false, message: `Required: ${field.label ?? field.name}` };
		}
		if (field.type === 'email' && str && !EMAIL_RE.test(str)) {
			return { ok: false, message: `Invalid email: ${field.label ?? field.name}` };
		}
		normalized[field.name] = str;
	}
	return { ok: true, normalized };
}

function buildEmailBody(siteName: string, pageYaml: PageYaml, values: Record<string, string | boolean>): string {
	const lines: string[] = [];
	lines.push(`Site: ${siteName}`);
	lines.push(`Form: ${pageYaml.form?.title ?? pageYaml.title ?? pageYaml.id}`);
	lines.push('');
	for (const field of pageYaml.form?.fields ?? []) {
		const label = field.label ?? field.name;
		const v = formatFieldValue(field, values[field.name] ?? (field.type === 'checkbox' ? false : ''));
		lines.push(`${label}: ${v}`);
	}
	return lines.join('\n');
}

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const site = locals.site;
	if (!site) throw error(404, 'Site not found');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	if (!body || typeof body !== 'object') throw error(400, 'Invalid body');

	const b = body as Record<string, unknown>;
	const modalId = typeof b.modalId === 'string' ? b.modalId.trim() : '';
	const slugPartsRaw = b.slugParts;
	const valuesIn = b.values;

	if (!valuesIn || typeof valuesIn !== 'object' || Array.isArray(valuesIn)) {
		throw error(400, 'Missing values');
	}

	let pageYaml: PageYaml | null = null;

	if (modalId) {
		if (!isSafeModalId(modalId)) throw error(400, 'Invalid modalId');
		pageYaml = await loadModalYaml(site, modalId);
	} else if (Array.isArray(slugPartsRaw)) {
		const slugParts = slugPartsRaw.filter((x): x is string => typeof x === 'string').map((s) => s.trim());
		if (slugParts.some((s) => !isSafeSlugPart(s))) throw error(400, 'Invalid slugParts');
		pageYaml = await loadPageYaml(site, slugParts, platform);
	} else {
		throw error(400, 'Provide modalId or slugParts');
	}

	if (!pageYaml || pageYaml.layout !== 'form' || !pageYaml.form) {
		throw error(404, 'Form not found');
	}

	const sendTo = pageYaml.send_email?.trim();
	if (!sendTo || !EMAIL_RE.test(sendTo)) {
		throw error(400, 'Form does not accept email submissions');
	}

	const validated = validateValues(pageYaml.form.fields, valuesIn as Record<string, unknown>);
	if (!validated.ok) {
		return json({ ok: false, error: validated.message }, { status: 400 });
	}

	const subject = `[${site.name ?? site.siteId}] ${pageYaml.form?.title ?? pageYaml.title ?? pageYaml.id}`;
	const text = buildEmailBody(site.name ?? site.siteId, pageYaml, validated.normalized);

	const sent = await sendFormNotificationEmail({ to: sendTo, subject, text });
	if (!sent.ok) {
		return json({ ok: false, error: sent.error }, { status: 503 });
	}

	return json({ ok: true, message: pageYaml.form?.success_message ?? 'Thanks — your submission was sent.' });
};
