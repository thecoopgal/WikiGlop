import { getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { runGlopSearchQuery } from '$lib/server/glop-search-page';
import {
	isGlopSearchDbError,
	listTopGlopedQuestions,
	type GlopAnswerRow,
	type GlopQuestionRow,
	type TopGlopedQuestion
} from '$lib/server/glop-search';
import {
	listUnansweredGlopQuestions,
	parseUnansweredGlopSort,
	type UnansweredGlopSort
} from '$lib/server/glop-search-resolve';
import type { UrlSeoSnippet } from '$lib/server/url-seo';

const GLOOPGLOP_SITE_ID = 'gloopglop';

function resolvePlatform(platform: App.Platform | undefined): App.Platform | undefined {
	return platform ?? getRequestEvent()?.platform;
}

export const load: PageServerLoad = async ({ locals, url, platform: platformProp }) => {
	const platform = resolvePlatform(platformProp);
	if (locals.site?.siteId !== GLOOPGLOP_SITE_ID) {
		throw error(404, 'Not found');
	}

	const qRaw = url.searchParams.get('q') ?? '';
	const query = qRaw.trim();
	const unansweredSort: UnansweredGlopSort = parseUnansweredGlopSort(
		url.searchParams.get('unansweredSort')
	);
	if (query.length < 2) {
		let topGlopedQuestions: TopGlopedQuestion[] = [];
		let unansweredGlopQuestions: GlopQuestionRow[] = [];
		try {
			topGlopedQuestions = await listTopGlopedQuestions(platform, locals.site.siteId, 10);
		} catch (topErr) {
			console.error('Top gloped questions failed (landing continues):', topErr);
		}
		try {
			unansweredGlopQuestions = await listUnansweredGlopQuestions(
				platform,
				locals.site.siteId,
				url,
				10,
				unansweredSort
			);
		} catch (unansweredErr) {
			console.error('Unanswered glop questions failed (landing continues):', unansweredErr);
		}
		return {
			site: locals.site,
			query,
			answers: [] as GlopAnswerRow[],
			searched: false,
			seoByUrl: {} as Record<string, UrlSeoSnippet>,
			canonicalHrefByAnswerUrl: {} as Record<string, string>,
			glopCountByAnswerUrl: {} as Record<string, number>,
			creatorSearchUi: null,
			topGlopedQuestions,
			unansweredGlopQuestions,
			unansweredSort
		};
	}

	try {
		const searchResult = await runGlopSearchQuery({
			platform,
			siteId: locals.site.siteId,
			queryRaw: query,
			requestUrl: url
		});

		if (searchResult.dbUnavailable) {
			return {
				site: locals.site,
				query: searchResult.query,
				answers: [] as GlopAnswerRow[],
				searched: true,
				dbUnavailable: true as const,
				seoByUrl: {} as Record<string, UrlSeoSnippet>,
				canonicalHrefByAnswerUrl: {} as Record<string, string>,
				glopCountByAnswerUrl: {} as Record<string, number>,
				creatorSearchUi: null,
				topGlopedQuestions: [] as TopGlopedQuestion[],
				unansweredGlopQuestions: [] as GlopQuestionRow[],
				unansweredSort
			};
		}

		return {
			site: locals.site,
			query: searchResult.query,
			answers: searchResult.answers,
			searched: true,
			seoByUrl: searchResult.seoByUrl,
			canonicalHrefByAnswerUrl: searchResult.canonicalHrefByAnswerUrl,
			glopCountByAnswerUrl: searchResult.glopCountByAnswerUrl,
			creatorSearchUi: searchResult.creatorSearchUi,
			topGlopedQuestions: [] as TopGlopedQuestion[],
			unansweredGlopQuestions: [] as GlopQuestionRow[],
			unansweredSort
		};
	} catch (e) {
		console.error('Search load failed:', e);
		if (isGlopSearchDbError(e)) {
			return {
				site: locals.site,
				query,
				answers: [] as GlopAnswerRow[],
				searched: true,
				dbUnavailable: true as const,
				seoByUrl: {} as Record<string, UrlSeoSnippet>,
				canonicalHrefByAnswerUrl: {} as Record<string, string>,
				glopCountByAnswerUrl: {} as Record<string, number>,
				creatorSearchUi: null,
				topGlopedQuestions: [] as TopGlopedQuestion[],
				unansweredGlopQuestions: [] as GlopQuestionRow[],
				unansweredSort
			};
		}
		throw error(503, 'Search is temporarily unavailable.');
	}
};
