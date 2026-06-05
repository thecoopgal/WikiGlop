import { browser } from '$app/environment';
import { clearLinksCreateCreatorPageColors } from '$lib/client/links-create-page-colors';

import type {
	CreatorLinkField,
	CreatorLinkIconMode,
	CreatorNameField,
	CreatorPreviewLink,
	CreatorShareIconVariant
} from '$lib/links-create-context';
import {
	defaultCreatorLinkIconMode,
	isCreatorLinkIconMode
} from '$lib/creator-link-icon';

import {

	isCreatorLinksThemeId,

	type CreatorLinksThemeId

} from '$lib/links-creator-themes';



const PROFILE_THEME_KEY = 'wikiglop.links.create.profile_theme';

const CREATOR_NAMES_KEY = 'wikiglop.links.create.creator_names';
const CREATOR_TAGLINE_KEY = 'wikiglop.links.create.creator_tagline';
const CREATOR_PAGE_DESCRIPTION_KEY = 'wikiglop.links.create.creator_page_description';
const CREATOR_LINKS_KEY = 'wikiglop.links.create.creator_links';
const CREATOR_PROFILE_PICTURE_KEY = 'wikiglop.links.create.creator_profile_picture';
const CREATOR_SHARE_ICON_VARIANT_KEY = 'wikiglop.links.create.creator_share_icon_variant';
const CREATOR_IMPORTED_THEME_MODE_KEY = 'wikiglop.links.create.imported_site_theme_mode';

export const LINKS_CREATOR_NAME_MAX_LENGTH = 120;
export const LINKS_CREATOR_NAMES_MAX_COUNT = 5;
export const LINKS_CREATOR_TAGLINE_MAX_LENGTH = 200;
export const LINKS_CREATOR_PAGE_DESCRIPTION_MAX_LENGTH = 500;
export const LINKS_CREATOR_LINK_LABEL_MAX_LENGTH = 80;
export const LINKS_CREATOR_LINK_URL_MAX_LENGTH = 500;



/** Clear saved create-flow data so /links/start can begin a fresh page. */
export function resetLinksCreateSession(): void {
	if (!browser) return;
	sessionStorage.removeItem(PROFILE_THEME_KEY);
	sessionStorage.removeItem(CREATOR_NAMES_KEY);
	sessionStorage.removeItem(CREATOR_TAGLINE_KEY);
	sessionStorage.removeItem(CREATOR_PAGE_DESCRIPTION_KEY);
	sessionStorage.removeItem(CREATOR_LINKS_KEY);
	sessionStorage.removeItem(CREATOR_PROFILE_PICTURE_KEY);
	sessionStorage.removeItem(CREATOR_SHARE_ICON_VARIANT_KEY);
	sessionStorage.removeItem(CREATOR_IMPORTED_THEME_MODE_KEY);
	clearLinksCreateCreatorPageColors();
}

export function getLinksCreateProfileTheme(): CreatorLinksThemeId | null {

	if (!browser) return null;

	const raw = sessionStorage.getItem(PROFILE_THEME_KEY);

	return raw && isCreatorLinksThemeId(raw) ? raw : null;

}



export function setLinksCreateProfileTheme(theme: CreatorLinksThemeId): void {

	if (!browser) return;

	sessionStorage.setItem(PROFILE_THEME_KEY, theme);

}



export function getLinksCreateCreatorNames(): string[] {

	if (!browser) return [];

	const raw = sessionStorage.getItem(CREATOR_NAMES_KEY);

	if (!raw) return [];

	try {

		const parsed = JSON.parse(raw) as unknown;

		if (!Array.isArray(parsed)) return [];

		return getValidLinksCreatorNames(
			parsed.filter((value): value is string => typeof value === 'string')
		);

	} catch {

		return [];

	}

}



export function isValidLinksCreatorName(name: string): boolean {

	const trimmed = name.trim();

	if (trimmed.length < 2) return false;

	return /\p{L}/u.test(trimmed);

}



export function creatorNameFieldValues(fields: CreatorNameField[]): string[] {

	return fields.map((field) => field.value);

}



export function getValidLinksCreatorNames(names: string[]): string[] {

	return names
		.map((name) => name.trim())
		.filter(isValidLinksCreatorName)
		.slice(0, LINKS_CREATOR_NAMES_MAX_COUNT);

}



export function linksCreatorNameFieldStatus(fields: CreatorNameField[]): {

	hasValid: boolean;

	canContinue: boolean;

} {

	return linksCreatorNameFieldStatusFromValues(creatorNameFieldValues(fields));

}



export function linksCreatorNameFieldStatusFromValues(names: string[]): {

	hasValid: boolean;

	canContinue: boolean;

} {

	const nonEmpty = names.map((name) => name.trim()).filter((name) => name.length > 0);

	const hasValid = nonEmpty.some(isValidLinksCreatorName);

	const hasInvalid = nonEmpty.some((name) => !isValidLinksCreatorName(name));

	return { hasValid, canContinue: hasValid && !hasInvalid };

}



export function setLinksCreateCreatorNames(names: string[]): void {

	if (!browser) return;

	const valid = getValidLinksCreatorNames(names);

	if (valid.length > 0) {

		sessionStorage.setItem(CREATOR_NAMES_KEY, JSON.stringify(valid));

		return;

	}

	sessionStorage.removeItem(CREATOR_NAMES_KEY);

}



export function persistCreatorNameFields(fields: CreatorNameField[]): void {

	setLinksCreateCreatorNames(creatorNameFieldValues(fields));

}



export function creatorNameFieldsFromValues(

	values: string[],

	startId = 0

): { fields: CreatorNameField[]; nextId: number } {

	const fields = values
		.slice(0, LINKS_CREATOR_NAMES_MAX_COUNT)
		.map((value, index) => ({ id: startId + index, value }));

	return { fields, nextId: startId + fields.length };

}



export function defaultCreatorNameFields(): {

	fields: CreatorNameField[];

	nextId: number;

} {

	return { fields: [{ id: 0, value: '' }], nextId: 1 };

}



export function getLinksCreateCreatorTagline(): string {
	if (!browser) return '';
	return sessionStorage.getItem(CREATOR_TAGLINE_KEY)?.trim() ?? '';
}

export function isValidLinksCreatorTagline(tagline: string): boolean {
	return tagline.trim().length >= 2;
}

export function setLinksCreateCreatorTagline(tagline: string): void {
	if (!browser) return;
	const trimmed = tagline.trim();
	if (isValidLinksCreatorTagline(trimmed)) {
		sessionStorage.setItem(CREATOR_TAGLINE_KEY, trimmed);
		return;
	}
	sessionStorage.removeItem(CREATOR_TAGLINE_KEY);
}

export function getLinksCreateCreatorPageDescription(): string {
	if (!browser) return '';
	return sessionStorage.getItem(CREATOR_PAGE_DESCRIPTION_KEY) ?? '';
}

export function isValidLinksCreatorPageDescription(description: string): boolean {
	return description.trim().length >= 2;
}

export function setLinksCreateCreatorPageDescription(description: string): void {
	if (!browser) return;
	if (description.length === 0) {
		sessionStorage.removeItem(CREATOR_PAGE_DESCRIPTION_KEY);
		return;
	}
	sessionStorage.setItem(CREATOR_PAGE_DESCRIPTION_KEY, description);
}

export function isValidLinksCreatorProfilePicture(value: string): boolean {
	const trimmed = value.trim();
	if (!trimmed) return false;
	return trimmed.startsWith('data:image/') || /^https?:\/\//i.test(trimmed);
}

export function getLinksCreateCreatorProfilePicture(): string {
	if (!browser) return '';
	return sessionStorage.getItem(CREATOR_PROFILE_PICTURE_KEY) ?? '';
}

export function setLinksCreateCreatorProfilePicture(value: string): void {
	if (!browser) return;
	const trimmed = value.trim();
	if (!trimmed || !isValidLinksCreatorProfilePicture(trimmed)) {
		sessionStorage.removeItem(CREATOR_PROFILE_PICTURE_KEY);
		return;
	}
	sessionStorage.setItem(CREATOR_PROFILE_PICTURE_KEY, trimmed);
}

export function isCreatorShareIconVariant(value: string): value is CreatorShareIconVariant {
	return value === 'light' || value === 'dark';
}

export function getLinksCreateCreatorShareIconVariant(): CreatorShareIconVariant {
	if (!browser) return 'light';
	const raw = sessionStorage.getItem(CREATOR_SHARE_ICON_VARIANT_KEY);
	return raw && isCreatorShareIconVariant(raw) ? raw : 'light';
}

export function setLinksCreateCreatorShareIconVariant(value: CreatorShareIconVariant): void {
	if (!browser) return;
	sessionStorage.setItem(CREATOR_SHARE_ICON_VARIANT_KEY, value);
}

export function normalizeLinksCreatorUrl(url: string): string {
	const trimmed = url.trim();
	if (!trimmed) return '';
	return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export const LINKS_CREATOR_LINK_DEFAULT_LABEL = 'Link';

export function isValidLinksCreatorUrl(url: string): boolean {
	try {
		const normalized = normalizeLinksCreatorUrl(url);
		if (!normalized) return false;
		const parsed = new URL(normalized);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:';
	} catch {
		return false;
	}
}

/** Link name is optional; a valid URL is enough. */
export function isValidLinksCreatorLink(_label: string, url: string): boolean {
	return isValidLinksCreatorUrl(url);
}

export function displayLinksCreatorLinkLabel(label: string): string {
	const trimmed = label.trim();
	return trimmed.length >= 2 ? trimmed : LINKS_CREATOR_LINK_DEFAULT_LABEL;
}

export function creatorLinkFieldValues(fields: CreatorLinkField[]): CreatorPreviewLink[] {
	return fields
		.map((field) => ({
			label: field.label.trim(),
			href: normalizeLinksCreatorUrl(field.url),
			iconMode: field.iconMode
		}))
		.filter((link) => isValidLinksCreatorUrl(link.href));
}

export function getPreviewLinksCreatorLinks(fields: CreatorLinkField[]): CreatorPreviewLink[] {
	return creatorLinkFieldValues(fields).map((link) => ({
		...link,
		label: displayLinksCreatorLinkLabel(link.label)
	}));
}

export function getValidLinksCreatorLinks(fields: CreatorLinkField[]): CreatorPreviewLink[] {
	return creatorLinkFieldValues(fields);
}

export function linksCreatorLinkFieldStatus(fields: CreatorLinkField[]): {
	hasValid: boolean;
	canContinue: boolean;
} {
	const nonEmpty = fields.filter(
		(field) => field.label.trim().length > 0 || field.url.trim().length > 0
	);
	const hasValid = nonEmpty.some((field) => isValidLinksCreatorUrl(field.url));
	const hasInvalid = nonEmpty.some(
		(field) => field.url.trim().length > 0 && !isValidLinksCreatorUrl(field.url)
	);
	// Messy share/tracking links warn in the UI but do not block continuing.
	return { hasValid, canContinue: hasValid && !hasInvalid };
}

export function getLinksCreateCreatorLinks(): CreatorPreviewLink[] {
	if (!browser) return [];
	const raw = sessionStorage.getItem(CREATOR_LINKS_KEY);
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter(
				(item): item is CreatorPreviewLink =>
					typeof item === 'object' &&
					item != null &&
					typeof (item as CreatorPreviewLink).label === 'string' &&
					typeof (item as CreatorPreviewLink).href === 'string'
			)
			.map((link) => ({
				...link,
				iconMode: isCreatorLinkIconMode(link.iconMode)
					? link.iconMode
					: defaultCreatorLinkIconMode(link.href)
			}))
			.filter((link) => isValidLinksCreatorUrl(link.href));
	} catch {
		return [];
	}
}

export function setLinksCreateCreatorLinks(links: CreatorPreviewLink[]): void {
	if (!browser) return;
	const valid = links.filter((link) => isValidLinksCreatorUrl(link.href));
	if (valid.length > 0) {
		sessionStorage.setItem(CREATOR_LINKS_KEY, JSON.stringify(valid));
		return;
	}
	sessionStorage.removeItem(CREATOR_LINKS_KEY);
}

export function persistCreatorLinkFields(fields: CreatorLinkField[]): void {
	setLinksCreateCreatorLinks(creatorLinkFieldValues(fields));
}

export function creatorLinkFieldsFromValues(
	links: CreatorPreviewLink[],
	startId = 0
): { fields: CreatorLinkField[]; nextId: number } {
	const fields = links.map((link, index) => ({
		id: startId + index,
		label: link.label,
		url: link.href,
		iconMode: link.iconMode ?? defaultCreatorLinkIconMode(link.href)
	}));
	return { fields, nextId: startId + fields.length };
}

export function defaultCreatorLinkFields(): {
	fields: CreatorLinkField[];
	nextId: number;
} {
	return { fields: [{ id: 0, label: '', url: '', iconMode: 'basic' }], nextId: 1 };
}

function reorderFieldsById<T extends { id: number }>(
	fields: T[],
	fromId: number,
	toId: number
): T[] {
	const fromIndex = fields.findIndex((field) => field.id === fromId);
	const toIndex = fields.findIndex((field) => field.id === toId);
	if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return fields;
	const next = [...fields];
	const [moved] = next.splice(fromIndex, 1);
	next.splice(toIndex, 0, moved);
	return next;
}

export function reorderCreatorNameFields(
	fields: CreatorNameField[],
	fromId: number,
	toId: number
): CreatorNameField[] {
	return reorderFieldsById(fields, fromId, toId);
}

export function reorderCreatorLinkFields(
	fields: CreatorLinkField[],
	fromId: number,
	toId: number
): CreatorLinkField[] {
	return reorderFieldsById(fields, fromId, toId);
}

function moveFieldByOffset<T extends { id: number }>(
	fields: T[],
	fieldId: number,
	offset: -1 | 1
): T[] {
	const index = fields.findIndex((field) => field.id === fieldId);
	if (index === -1) return fields;
	const targetIndex = index + offset;
	if (targetIndex < 0 || targetIndex >= fields.length) return fields;
	return reorderFieldsById(fields, fieldId, fields[targetIndex].id);
}

export function moveCreatorNameFieldUp(
	fields: CreatorNameField[],
	fieldId: number
): CreatorNameField[] {
	return moveFieldByOffset(fields, fieldId, -1);
}

export function moveCreatorNameFieldDown(
	fields: CreatorNameField[],
	fieldId: number
): CreatorNameField[] {
	return moveFieldByOffset(fields, fieldId, 1);
}

export function moveCreatorLinkFieldUp(
	fields: CreatorLinkField[],
	fieldId: number
): CreatorLinkField[] {
	return moveFieldByOffset(fields, fieldId, -1);
}

export function moveCreatorLinkFieldDown(
	fields: CreatorLinkField[],
	fieldId: number
): CreatorLinkField[] {
	return moveFieldByOffset(fields, fieldId, 1);
}

