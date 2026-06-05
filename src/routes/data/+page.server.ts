import { getRequestEvent } from '$app/server';
import type { PageServerLoad } from './$types';
import { listTopGlopedQuestions, type GlopQuestionRow, type TopGlopedQuestion } from '$lib/server/glop-search';
import {
	listUnansweredGlopQuestions,
	parseUnansweredGlopSort,
	type UnansweredGlopSort
} from '$lib/server/glop-search-resolve';
import { assertGloopglopUploadSite } from '$lib/server/upload-gate';

function resolvePlatform(platform: App.Platform | undefined): App.Platform | undefined {
	return platform ?? getRequestEvent()?.platform;
}

export const load: PageServerLoad = async ({ locals, url, platform: platformProp }) => {
	const platform = resolvePlatform(platformProp);
	assertGloopglopUploadSite(locals.site);

	const unansweredSort: UnansweredGlopSort = parseUnansweredGlopSort(
		url.searchParams.get('unansweredSort')
	);

	let topGlopedQuestions: TopGlopedQuestion[] = [];
	let unansweredGlopQuestions: GlopQuestionRow[] = [];

	try {
		topGlopedQuestions = await listTopGlopedQuestions(platform, locals.site!.siteId, 10);
	} catch (err) {
		console.error('Top gloped questions failed:', err);
	}

	try {
		unansweredGlopQuestions = await listUnansweredGlopQuestions(
			platform,
			locals.site!.siteId,
			url,
			10,
			unansweredSort
		);
	} catch (err) {
		console.error('Unanswered glop questions failed:', err);
	}

	return {
		site: locals.site,
		topGlopedQuestions,
		unansweredGlopQuestions,
		unansweredSort
	};
};
