import JSZip from 'jszip';
import { stringify } from 'yaml';
import {
	getThemePreference,
	resolveEffectiveTheme
} from '$lib/client/theme-preference';
import {
	creatorNameFieldValues,
	getPreviewLinksCreatorLinks,
	getValidLinksCreatorNames
} from '$lib/client/links-create-state';
import type { LinksCreateContextState } from '$lib/links-create-context';
import type { LinksPageSubmissionPayload } from '$lib/links-submission-payload';
import {
	buildLinksSubmissionSiteDocs,
	buildLinksSubmissionSiteDocsFromPayload,
	type LinksSubmissionSiteInput
} from '$lib/links-submission-site';

export type CreatorSiteYamlBundle = {
	siteId: string;
	siteYaml: string;
	pageYaml: string;
};

function toYamlBundle(docs: ReturnType<typeof buildLinksSubmissionSiteDocs>): CreatorSiteYamlBundle {
	const { siteId, site, page } = docs;
	return {
		siteId,
		siteYaml: `# Copy to content/sites/${siteId}/site.yaml\n${stringify(site)}`,
		pageYaml: `# Copy to content/sites/${siteId}/pages/index.yaml\n${stringify(page)}`
	};
}

export function buildCreatorSiteYamlBundle(state: LinksCreateContextState): CreatorSiteYamlBundle {
	const input: LinksSubmissionSiteInput = {
		selectedTheme: state.selectedTheme,
		names: getValidLinksCreatorNames(creatorNameFieldValues(state.creatorNameFields)),
		tagline: state.creatorTagline,
		description: state.creatorPageDescription,
		links: getPreviewLinksCreatorLinks(state.creatorLinkFields),
		profilePicture: state.creatorProfilePicture,
		pageColors: state.creatorPageColors,
		shareIconVariant: state.creatorShareIconVariant,
		themeMode: resolveEffectiveTheme(getThemePreference())
	};
	return toYamlBundle(buildLinksSubmissionSiteDocs(input));
}

export function buildCreatorSiteYamlBundleFromSubmission(
	payload: LinksPageSubmissionPayload,
	creatorId?: string | null
): CreatorSiteYamlBundle {
	return toYamlBundle(buildLinksSubmissionSiteDocsFromPayload(payload, creatorId));
}

async function downloadSiteYamlZip(bundle: CreatorSiteYamlBundle): Promise<void> {
	const { siteId, siteYaml, pageYaml } = bundle;
	const zip = new JSZip();
	zip.file('site.yaml', siteYaml);
	zip.folder('pages')?.file('index.yaml', pageYaml);
	zip.file(
		'README.txt',
		[
			'GloopGlop creator site export',
			'',
			`1. Create content/sites/${siteId}/`,
			`2. Place site.yaml in content/sites/${siteId}/`,
			`3. Place pages/index.yaml in content/sites/${siteId}/pages/`,
			'4. Replace the avatar URL if your profile picture was not already hosted on a CDN.'
		].join('\n')
	);

	const blob = await zip.generateAsync({ type: 'blob' });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = `${siteId}-gloopglop-site.zip`;
	anchor.click();
	URL.revokeObjectURL(url);
}

export async function downloadCreatorSiteYaml(state: LinksCreateContextState): Promise<void> {
	await downloadSiteYamlZip(buildCreatorSiteYamlBundle(state));
}

export async function downloadSubmissionSiteYaml(
	payload: LinksPageSubmissionPayload,
	creatorId?: string | null
): Promise<void> {
	await downloadSiteYamlZip(buildCreatorSiteYamlBundleFromSubmission(payload, creatorId));
}
