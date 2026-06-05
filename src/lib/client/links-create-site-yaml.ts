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
import { GLOOPGLOP_CUSTOM_COLOR_FIELDS } from '$lib/daisy-theme-colors';
import type { LinksCreateContextState } from '$lib/links-create-context';

export type CreatorSiteYamlBundle = {
	siteId: string;
	siteYaml: string;
	pageYaml: string;
};

function creatorSiteIdFromName(name: string): string {
	const slug = name
		.trim()
		.replace(/^@+/, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
	return slug.length >= 2 ? slug : 'your-site-id';
}

function avatarYamlValue(profilePicture: string): string {
	const trimmed = profilePicture.trim();
	if (/^https?:\/\//i.test(trimmed)) return trimmed;
	return 'https://YOUR-CDN-URL/profile.jpg';
}

function themeOverrides(colors: LinksCreateContextState['creatorPageColors']) {
	const overrides: Record<string, string> = {};
	for (const { key } of GLOOPGLOP_CUSTOM_COLOR_FIELDS) {
		const value = colors[key]?.trim();
		if (value) overrides[key] = value;
	}
	return Object.keys(overrides).length > 0 ? overrides : undefined;
}

export function buildCreatorSiteYamlBundle(state: LinksCreateContextState): CreatorSiteYamlBundle {
	const names = getValidLinksCreatorNames(creatorNameFieldValues(state.creatorNameFields));
	const primaryName = names[0] ?? 'Your name';
	const siteId = creatorSiteIdFromName(primaryName);
	const displayTitle = primaryName.trim() || 'Creator';
	const tagline = state.creatorTagline.trim();
	const description = state.creatorPageDescription.trim();
	const links = getPreviewLinksCreatorLinks(state.creatorLinkFields);
	const themeMode = resolveEffectiveTheme(getThemePreference());

	const siteDoc = {
		id: siteId,
		name: displayTitle.replace(/^@+/, '') || displayTitle,
		hosts: [
			`${siteId}.localhost`,
			`${siteId}.gloopglop.com`,
			`www.${siteId}.gloopglop.com`,
			`${siteId}.gloop.gg`,
			`www.${siteId}.gloop.gg`
		],
		kind: 'platform',
		theme: {
			preset: state.selectedTheme ?? 'gloopglop',
			mode: themeMode,
			...(themeOverrides(state.creatorPageColors)
				? { overrides: themeOverrides(state.creatorPageColors) }
				: {})
		},
		routing: {
			default_page: 'index'
		},
		permissions: {
			view: 'public',
			propose: 'members',
			edit: 'restricted',
			edit_mode: 'proposal_required'
		}
	};

	const profileBlock: Record<string, unknown> = {
		type: 'creator_profile',
		id: 'profile',
		name: primaryName,
		profile_theme: state.selectedTheme ?? 'gloopglop',
		...(names.length > 1 ? { names, name_animation: 'all' } : {}),
		...(tagline ? { tagline } : {}),
		avatar: avatarYamlValue(state.creatorProfilePicture),
		...(description ? { bio: description } : {}),
		...(state.creatorShareIconVariant === 'dark' ? { share_icon_variant: 'dark' } : {}),
		...(links.length > 0
			? {
					short_links: links.map((link) => {
						const item: Record<string, string> = {
							label: link.label,
							href: link.href
						};
						if (link.iconMode && link.iconMode !== 'basic') {
							item.icon_mode = link.iconMode;
						}
						return item;
					})
				}
			: {})
	};

	const pageDoc = {
		id: 'index',
		title: displayTitle.replace(/^@+/, '') || displayTitle,
		path: '/',
		layout: 'creator_links',
		seo: {
			title: displayTitle.replace(/^@+/, '') || displayTitle,
			description: tagline || description || `Creator bio and links for ${displayTitle}.`,
			image: /^https?:\/\//i.test(state.creatorProfilePicture.trim())
				? state.creatorProfilePicture.trim()
				: undefined
		},
		page_settings: {
			show_header: true,
			show_footer: true,
			max_width: 'sm'
		},
		notifications: {
			enabled: true,
			title: `Follow ${displayTitle.replace(/^@+/, '') || displayTitle}`,
			description: 'Choose what updates you want.',
			topics: [
				{ id: 'go_live', label: 'Go Live', default: true },
				{ id: 'updates', label: 'Updates', default: true }
			]
		},
		blocks: [profileBlock]
	};

	const siteYaml = `# Copy to content/sites/${siteId}/site.yaml\n${stringify(siteDoc)}`;
	const pageYaml = `# Copy to content/sites/${siteId}/pages/index.yaml\n${stringify(pageDoc)}`;

	return { siteId, siteYaml, pageYaml };
}

export async function downloadCreatorSiteYaml(state: LinksCreateContextState): Promise<void> {
	const { siteId, siteYaml, pageYaml } = buildCreatorSiteYamlBundle(state);
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
