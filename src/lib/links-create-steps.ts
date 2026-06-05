export const LINKS_CREATE_STEPS = [
	'hello',
	'gloops',
	'theme',
	'name',
	'tagline',
	'description',
	'links',
	'photo',
	'almost-done',
	'customize'
] as const;

export type LinksCreateStep = (typeof LINKS_CREATE_STEPS)[number];

export const LINKS_CREATE_HEADLINES: Record<LinksCreateStep, string> = {
	hello: 'Hello',
	gloops: 'Lets get your gloops glopped',
	theme: 'First, Select your theme',
	name: 'Next, What is your name?',
	tagline: "Now, What's your tagline?",
	description: 'Give me, your page description',
	links: "Let's add, your links!",
	photo: 'Smile, set your profile picture',
	'almost-done': 'Nice, almost done',
	customize: 'Customize, your GloopGlop Page'
};

export function isLinksCreateStep(value: string): value is LinksCreateStep {
	return (LINKS_CREATE_STEPS as readonly string[]).includes(value);
}

export function linksCreateStepIndex(step: LinksCreateStep): number {
	return LINKS_CREATE_STEPS.indexOf(step);
}

/** Progress from 0–1 based on how far through the create flow the step is. */
export function linksCreateStepProgress(step: LinksCreateStep): number {
	return (linksCreateStepIndex(step) + 1) / LINKS_CREATE_STEPS.length;
}

export function nextLinksCreateStep(step: LinksCreateStep): LinksCreateStep | null {
	const index = linksCreateStepIndex(step);
	if (index === -1 || index >= LINKS_CREATE_STEPS.length - 1) return null;
	return LINKS_CREATE_STEPS[index + 1];
}

export function prevLinksCreateStep(step: LinksCreateStep): LinksCreateStep | null {
	const index = linksCreateStepIndex(step);
	if (index <= 0) return null;
	return LINKS_CREATE_STEPS[index - 1];
}
