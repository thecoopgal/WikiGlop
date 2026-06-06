import { GLOOPGLOP_CUSTOM_COLOR_FIELDS } from '$lib/daisy-theme-colors';
import type { LinksPageSubmissionPayload } from '$lib/links-submission-payload';

export type LinksSubmissionSiteInput = {
	selectedTheme: string | null;
	names: string[];
	tagline: string;
	description: string;
	links: Array<{ label: string; href: string; iconMode?: string }>;
	profilePicture: string;
	pageColors: Record<string, string>;
	shareIconVariant?: 'light' | 'dark';
	themeMode: 'light' | 'dark';
	siteIdOverride?: string | null;
};

export type LinksSubmissionSiteDocs = {
	siteId: string;
	site: Record<string, unknown>;
	page: Record<string, unknown>;
};

export function creatorSiteIdFromName(name: string): string {
	const slug = name
		.trim()
		.replace(/^@+/, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
	return slug.length >= 2 ? slug : 'your-site-id';
}

function avatarValue(profilePicture: string): string {
	const trimmed = profilePicture.trim();
	if (/^https?:\/\//i.test(trimmed)) return trimmed;
	return 'https://YOUR-CDN-URL/profile.jpg';
}

function themeOverrides(colors: Record<string, string | undefined>) {
	const overrides: Record<string, string> = {};
	for (const { key } of GLOOPGLOP_CUSTOM_COLOR_FIELDS) {
		const value = colors[key]?.trim();
		if (value) overrides[key] = value;
	}
	return Object.keys(overrides).length > 0 ? overrides : undefined;
}

export function linksSubmissionInputFromPayload(
	payload: LinksPageSubmissionPayload,
	creatorId?: string | null
): LinksSubmissionSiteInput {
	const profilePicture = payload.profilePictureUrl?.trim() ?? '';
	return {
		selectedTheme: payload.theme,
		names: payload.names,
		tagline: payload.tagline,
		description: payload.description,
		links: payload.links,
		profilePicture,
		pageColors: payload.pageColors,
		shareIconVariant: payload.shareIconVariant,
		themeMode: payload.siteThemeMode ?? 'light',
		siteIdOverride: creatorId
	};
}

export function buildLinksSubmissionSiteDocs(input: LinksSubmissionSiteInput): LinksSubmissionSiteDocs {
	const primaryName = input.names[0] ?? 'Your name';
	const siteId = input.siteIdOverride?.trim() || creatorSiteIdFromName(primaryName);
	const displayTitle = primaryName.trim() || 'Creator';
	const tagline = input.tagline.trim();
	const description = input.description.trim();
	const links = input.links;

	const site: Record<string, unknown> = {
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
			preset: input.selectedTheme ?? 'gloopglop',
			mode: input.themeMode,
			...(themeOverrides(input.pageColors) ? { overrides: themeOverrides(input.pageColors) } : {})
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
		profile_theme: input.selectedTheme ?? 'gloopglop',
		...(input.names.length > 1 ? { names: input.names, name_animation: 'all' } : {}),
		...(tagline ? { tagline } : {}),
		avatar: avatarValue(input.profilePicture),
		...(description ? { bio: description } : {}),
		...(input.shareIconVariant === 'dark' ? { share_icon_variant: 'dark' } : {}),
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

	const page: Record<string, unknown> = {
		id: 'index',
		title: displayTitle.replace(/^@+/, '') || displayTitle,
		path: '/',
		layout: 'creator_links',
		seo: {
			title: displayTitle.replace(/^@+/, '') || displayTitle,
			description: tagline || description || `Creator bio and links for ${displayTitle}.`,
			image: /^https?:\/\//i.test(input.profilePicture.trim())
				? input.profilePicture.trim()
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

	return { siteId, site, page };
}

export function buildLinksSubmissionSiteDocsFromPayload(
	payload: LinksPageSubmissionPayload,
	creatorId?: string | null
): LinksSubmissionSiteDocs {
	return buildLinksSubmissionSiteDocs(linksSubmissionInputFromPayload(payload, creatorId));
}
