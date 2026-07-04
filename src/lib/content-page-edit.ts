import type { PageBlock, PageYaml } from '$lib/server/content';

export type CreatorPageEditLink = {
	label: string;
	href: string;
};

export type CreatorPageEditForm = {
	names: string[];
	tagline: string;
	bio: string;
	avatar: string;
	links: CreatorPageEditLink[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null;
}

export function extractCreatorProfileBlock(page: PageYaml): Record<string, unknown> | null {
	const block = page.blocks?.find((item) => item.type === 'creator_profile');
	return block && isRecord(block) ? block : null;
}

export function formFromPage(page: PageYaml): CreatorPageEditForm | null {
	const profile = extractCreatorProfileBlock(page);
	if (!profile) return null;

	let names: string[] = [];
	if (Array.isArray(profile.names)) {
		names = profile.names
			.filter((n): n is string => typeof n === 'string')
			.map((n) => n.trim())
			.filter((n) => n.length > 0);
	} else if (typeof profile.name === 'string' && profile.name.trim()) {
		names = [profile.name.trim()];
	}
	if (names.length === 0) names = [''];

	const links: CreatorPageEditLink[] = [];
	if (Array.isArray(profile.short_links)) {
		for (const item of profile.short_links) {
			if (!isRecord(item) || typeof item.href !== 'string') continue;
			const href = item.href.trim();
			if (!href) continue;
			links.push({
				label: typeof item.label === 'string' ? item.label.trim() : '',
				href
			});
		}
	}

	const bioRaw = profile.bio;
	const bio =
		typeof bioRaw === 'string'
			? bioRaw
			: typeof bioRaw === 'object' && bioRaw !== null
				? String(bioRaw)
				: '';

	return {
		names,
		tagline: typeof profile.tagline === 'string' ? profile.tagline : '',
		bio,
		avatar: typeof profile.avatar === 'string' ? profile.avatar : '',
		links: links.length > 0 ? links : [{ label: '', href: '' }]
	};
}

export function applyFormToPage(page: PageYaml, form: CreatorPageEditForm): PageYaml {
	const names = form.names.map((n) => n.trim()).filter((n) => n.length > 0);
	if (names.length === 0) {
		throw new Error('At least one name is required.');
	}

	const links = form.links
		.map((l) => ({
			label: l.label.trim(),
			href: l.href.trim()
		}))
		.filter((l) => l.href.length > 0);

	const primary = names[0];
	const displayTitle = primary.replace(/^@+/, '') || primary;
	const tagline = form.tagline.trim();
	const bio = form.bio.trim();
	const avatar = form.avatar.trim();

	const blocks: PageBlock[] = (page.blocks ?? []).map((block) => {
		if (block.type !== 'creator_profile') return block;
		const next: Record<string, unknown> = {
			...block,
			type: 'creator_profile',
			name: primary
		};
		if (names.length > 1) {
			next.names = names;
			next.name_animation = 'all';
		} else {
			delete next.names;
			delete next.name_animation;
		}
		if (tagline) next.tagline = tagline;
		else delete next.tagline;
		if (bio) next.bio = bio;
		else delete next.bio;
		if (avatar) next.avatar = avatar;
		else delete next.avatar;
		if (links.length > 0) {
			next.short_links = links.map((link) => {
				const item: Record<string, string> = { label: link.label || link.href, href: link.href };
				const prev = Array.isArray(block.short_links)
					? block.short_links.find(
							(s) => isRecord(s) && typeof s.href === 'string' && s.href.trim() === link.href
						)
					: null;
				if (isRecord(prev) && typeof prev.icon_mode === 'string') {
					item.icon_mode = prev.icon_mode;
				}
				return item;
			});
		} else {
			delete next.short_links;
		}
		return next as PageBlock;
	});

	const seo =
		page.seo && typeof page.seo === 'object'
			? {
					...page.seo,
					title: displayTitle,
					...(tagline || bio
						? { description: tagline || bio }
						: {}),
					...(avatar && /^https?:\/\//i.test(avatar) ? { image: avatar } : {})
				}
			: {
					title: displayTitle,
					description: tagline || bio || undefined,
					image: avatar && /^https?:\/\//i.test(avatar) ? avatar : undefined
				};

	return {
		...page,
		title: displayTitle,
		seo,
		blocks
	};
}
