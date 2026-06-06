export type LinksPageSubmissionPayload = {
	theme: string | null;
	names: string[];
	tagline: string;
	description: string;
	links: Array<{ label: string; href: string; iconMode?: string }>;
	hasProfilePicture: boolean;
	profilePictureUrl?: string | null;
	pageColors: Record<string, string>;
	shareIconVariant?: 'light' | 'dark';
	siteThemeMode?: 'light' | 'dark';
};
