import { crossfade } from 'svelte/transition';
import { cubicInOut } from 'svelte/easing';

export const LINKS_PAGE_FADE_MS = 400;

export const linksFade = {
	duration: LINKS_PAGE_FADE_MS,
	easing: cubicInOut
};

const crossfadeOptions = linksFade;

/** Crossfade between /links/start and the create flow shell. */
export const [linksShellSend, linksShellReceive] = crossfade(crossfadeOptions);

/** Crossfade between individual create steps. */
export const [linksStepSend, linksStepReceive] = crossfade(crossfadeOptions);
