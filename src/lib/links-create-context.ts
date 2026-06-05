import type { GloopglopCustomColors } from '$lib/daisy-theme-colors';
import type { CreatorLinksThemeId } from '$lib/links-creator-themes';
import type { CreatorLinkIconMode } from '$lib/creator-link-icon';

export type { CreatorLinkIconMode };

export type CreatorNameField = {

	id: number;

	value: string;

};

export type CreatorLinkField = {
	id: number;
	label: string;
	url: string;
	iconMode: CreatorLinkIconMode;
};

export type CreatorPreviewLink = {
	label: string;
	href: string;
	iconMode?: CreatorLinkIconMode;
};

export type CreatorShareIconVariant = 'light' | 'dark';

export const LINKS_CREATE_CONTEXT_KEY = Symbol('links-create');

export type LinksCreateContextState = {
	selectedTheme: CreatorLinksThemeId | null;
	creatorNameFields: CreatorNameField[];
	nextCreatorNameFieldId: number;
	focusCreatorNameFieldId: number | null;
	creatorTagline: string;
	creatorPageDescription: string;
	creatorLinkFields: CreatorLinkField[];
	nextCreatorLinkFieldId: number;
	focusCreatorLinkFieldId: number | null;
	creatorProfilePicture: string;
	creatorPageColors: GloopglopCustomColors;
	creatorShareIconVariant: CreatorShareIconVariant;
};

