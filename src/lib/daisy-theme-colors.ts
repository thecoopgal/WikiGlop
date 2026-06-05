export const GLOOPGLOP_SITE_ID = 'gloopglop';

/** GloopGlop brand green — used for primary actions and Daisy `--color-primary`. */
export const GLOOPGLOP_BRAND = {
	primary: 'oklch(62% 0.18 155)',
	primaryContent: 'oklch(98% 0.01 155)',
	buttonBg: '#7ac943',
	buttonBorder: '#5f9626',
	buttonText: '#10210a',
	buttonHoverBg: '#6fb93b',
	buttonHoverBorder: '#4c7a1f'
} as const;

/** Theme colors users can tweak on the custom preset. */
export type GloopglopCustomColorKey =
	| 'base-100'
	| 'base-200'
	| 'card-border'
	| 'card-gradient'
	| 'link-background'
	| 'link-border'
	| 'link-text'
	| 'share-background'
	| 'share-border'
	| 'heading'
	| 'subheading'
	| 'button-text'
	| 'text-box-text';

export type GloopglopCustomColors = Record<GloopglopCustomColorKey, string>;

export const GLOOPGLOP_CUSTOM_COLOR_FIELDS: Array<{
	key: GloopglopCustomColorKey;
	label: string;
}> = [
	{ key: 'base-200', label: 'Page background' },
	{ key: 'base-100', label: 'Cards' },
	{ key: 'card-border', label: 'Card border' },
	{ key: 'card-gradient', label: 'Card gradient' },
	{ key: 'link-background', label: 'Link background' },
	{ key: 'link-border', label: 'Link border' },
	{ key: 'link-text', label: 'Link text' },
	{ key: 'share-background', label: 'Share profile background' },
	{ key: 'share-border', label: 'Share profile border' },
	{ key: 'heading', label: 'Header text' },
	{ key: 'subheading', label: 'Subheader text' },
	{ key: 'button-text', label: 'Button text' },
	{ key: 'text-box-text', label: 'Text box text' }
];

export function gloopglopColorVarName(key: GloopglopCustomColorKey): string {
	switch (key) {
		case 'heading':
			return '--gloopglop-heading-color';
		case 'subheading':
			return '--gloopglop-subheading-color';
		case 'button-text':
			return '--gloopglop-button-text-color';
		case 'text-box-text':
			return '--gloopglop-text-box-text-color';
		case 'link-background':
			return '--gloopglop-link-background-color';
		case 'link-border':
			return '--gloopglop-link-border-color';
		case 'link-text':
			return '--gloopglop-link-text-color';
		case 'share-background':
			return '--gloopglop-share-background-color';
		case 'share-border':
			return '--gloopglop-share-border-color';
		case 'card-border':
			return '--gloopglop-card-border-color';
		case 'card-gradient':
			return '--gloopglop-card-gradient-color';
		default:
			return `--color-${key}`;
	}
}

/** @deprecated Use gloopglopColorVarName */
export function daisyColorVarName(key: 'base-100' | 'base-200'): string {
	return `--color-${key}`;
}

export function isGloopglopSite(site: { id?: string; siteId?: string } | null | undefined): boolean {
	if (!site) return false;
	return site.siteId === GLOOPGLOP_SITE_ID || site.id === GLOOPGLOP_SITE_ID;
}
