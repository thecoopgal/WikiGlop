import type { PageFormField } from '$lib/server/content';

export type FormSubmitTarget =
	| { kind: 'modal'; modalId: string }
	| { kind: 'page'; slugParts: string[] };

export function collectFormFieldValues(
	formEl: HTMLFormElement,
	fields: PageFormField[]
): Record<string, string | boolean> {
	const out: Record<string, string | boolean> = {};
	for (const field of fields) {
		if (field.type === 'checkbox') {
			const el = formEl.elements.namedItem(field.name);
			out[field.name] = el instanceof HTMLInputElement && el.checked;
		} else {
			const fd = new FormData(formEl);
			const v = fd.get(field.name);
			out[field.name] = v == null ? '' : String(v);
		}
	}
	return out;
}

export async function postFormEmail(
	target: FormSubmitTarget,
	values: Record<string, string | boolean>
): Promise<{ ok: true; message?: string } | { ok: false; error: string }> {
	const body =
		target.kind === 'modal'
			? { modalId: target.modalId, values }
			: { slugParts: target.slugParts, values };

	const res = await fetch('/api/form-submit', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});

	let data: { error?: string; message?: string } = {};
	try {
		data = (await res.json()) as typeof data;
	} catch {
		/* empty */
	}

	if (!res.ok) {
		return {
			ok: false,
			error: typeof data.error === 'string' ? data.error : res.statusText || 'Request failed'
		};
	}

	return { ok: true, message: typeof data.message === 'string' ? data.message : undefined };
}
