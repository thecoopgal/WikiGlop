export const SELECTABLE_CREATOR_LINKS_THEMES = ['gloopglop'] as const;

export type CreatorLinksThemeId = (typeof SELECTABLE_CREATOR_LINKS_THEMES)[number];

export type CreatorLinksThemeOption =
	| {
			id: CreatorLinksThemeId;
			label: string;
			description: string;
			available: true;
	  }
	| {
			id: 'coming_soon';
			label: string;
			description: string;
			available: false;
	  };

export const CREATOR_LINKS_THEME_OPTIONS: CreatorLinksThemeOption[] = [
	{
		id: 'gloopglop',
		label: 'GloopGlop Default Theme',
		description: '',
		available: true
	},
	{
		id: 'coming_soon',
		label: 'Themes coming soon',
		description: '',
		available: false
	}
];

export function isCreatorLinksThemeId(value: string): value is CreatorLinksThemeId {
	return (SELECTABLE_CREATOR_LINKS_THEMES as readonly string[]).includes(value);
}
