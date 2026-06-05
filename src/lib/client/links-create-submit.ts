import type { LinksCreateContextState } from '$lib/links-create-context';
import {
	creatorNameFieldValues,
	getPreviewLinksCreatorLinks,
	getValidLinksCreatorNames
} from '$lib/client/links-create-state';

export type LinksCreateSubmitResult =
	| { ok: true; message?: string }
	| { ok: false; error: string };

export async function submitLinksCreateForm(
	state: LinksCreateContextState
): Promise<LinksCreateSubmitResult> {
	const names = getValidLinksCreatorNames(creatorNameFieldValues(state.creatorNameFields));
	const links = getPreviewLinksCreatorLinks(state.creatorLinkFields);

	const res = await fetch('/api/links-create/submit', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			theme: state.selectedTheme,
			names,
			tagline: state.creatorTagline.trim(),
			description: state.creatorPageDescription.trim(),
			links,
			hasProfilePicture: Boolean(state.creatorProfilePicture.trim()),
			pageColors: state.creatorPageColors
		})
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
