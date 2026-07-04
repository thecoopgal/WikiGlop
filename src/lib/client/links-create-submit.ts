import type { LinksCreateContextState } from '$lib/links-create-context';
import { getLinksCreateImportedSiteThemeMode } from '$lib/client/links-create-import';
import { getOrCreateBrowserClientId } from '$lib/client/gloop-browser-glop-limit';
import {
	creatorNameFieldValues,
	getPreviewLinksCreatorLinks,
	getValidLinksCreatorNames
} from '$lib/client/links-create-state';

export type LinksCreateSubmitResult =
	| { ok: true; message?: string; submissionId?: string; siteId?: string }
	| { ok: false; error: string };

export async function submitLinksCreateForm(
	state: LinksCreateContextState
): Promise<LinksCreateSubmitResult> {
	const names = getValidLinksCreatorNames(creatorNameFieldValues(state.creatorNameFields));
	const links = getPreviewLinksCreatorLinks(state.creatorLinkFields);
	const profilePicture = state.creatorProfilePicture.trim();
	const profilePictureUrl = /^https?:\/\//i.test(profilePicture) ? profilePicture : undefined;
	const importedSiteThemeMode = getLinksCreateImportedSiteThemeMode();

	const res = await fetch('/api/links-create/submit', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			clientKey: getOrCreateBrowserClientId(),
			theme: state.selectedTheme,
			names,
			tagline: state.creatorTagline.trim(),
			description: state.creatorPageDescription.trim(),
			links,
			hasProfilePicture: Boolean(profilePicture),
			profilePictureUrl,
			pageColors: state.creatorPageColors,
			shareIconVariant: state.creatorShareIconVariant,
			siteThemeMode: importedSiteThemeMode ?? undefined
		})
	});

	let data: { error?: string; message?: string; submissionId?: string; siteId?: string } = {};
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

	return {
		ok: true,
		message: typeof data.message === 'string' ? data.message : undefined,
		submissionId: typeof data.submissionId === 'string' ? data.submissionId : undefined,
		siteId: typeof data.siteId === 'string' ? data.siteId : undefined
	};
}
