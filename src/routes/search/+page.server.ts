import { getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { buildCanonicalHrefByAnswerUrl } from '$lib/server/glop-answer-canonical';
import { sortGlopAnswersForCreatorAwareSearch } from '$lib/server/glop-creator-search';
import {
	fetchGlopAnswerCountsForQuestion,
	isGlopSearchDbError,
	listTopGlopedQuestions,
	recordGlopQuestionAsk,
	type GlopAnswerRow,
	type GlopQuestionRow,
	type TopGlopedQuestion
} from '$lib/server/glop-search';
import {
	listUnansweredGlopQuestions,
	mergeGlopSearchAnswersForQuery,
	parseUnansweredGlopSort,
	type UnansweredGlopSort
} from '$lib/server/glop-search-resolve';
import { fetchSeoForUrls, type UrlSeoSnippet } from '$lib/server/url-seo';

const GLOOPGLOP_SITE_ID = 'gloopglop';
/** Cap outbound SEO fetches so /search stays under Workers subrequest limits. */
const MAX_SEO_PREFETCH = 12;

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
		try {
			await recordGlopQuestionAsk(platform, locals.site.siteId, query);
		} catch (questionErr) {
			console.error('Record glop question failed (search continues):', questionErr);
		}

		const { answers: merged, creatorSearchUi } = await mergeGlopSearchAnswersForQuery({
			platform,
			siteId: locals.site.siteId,
			queryRaw: query,
			requestUrl: url
		});
		const profileCanonicalHref = creatorSearchUi?.profileCanonicalUrl ?? null;

		let canonicalHrefByAnswerUrl: Record<string, string> = {};
		if (merged.length > 0) {
			try {
				canonicalHrefByAnswerUrl = await buildCanonicalHrefByAnswerUrl(
					merged.map((a) => a.answer_url)
				);
			} catch (canonErr) {
				console.error('Canonical URL mapping failed:', canonErr);
				for (const row of merged) {
					canonicalHrefByAnswerUrl[row.answer_url] = row.answer_url;
				}
			}
		}

		const rawUrls = [...new Set(merged.map((r) => r.answer_url))];
		let glopCountByAnswerUrl: Record<string, number> = {};
		if (rawUrls.length > 0) {
			try {
				glopCountByAnswerUrl = await fetchGlopAnswerCountsForQuestion(
					platform,
					locals.site.siteId,
					query,
					rawUrls
				);
			} catch (countsErr) {
				console.error('Glop per-question answer counts failed (search continues):', countsErr);
			}
		}

		const sortedAnswers = sortGlopAnswersForCreatorAwareSearch({
			rows: merged,
			canonicalHrefByAnswerUrl,
			profileCanonicalHref,
			globalCountByAnswerUrl: glopCountByAnswerUrl
		});

		const seoPrefetchOrder: string[] = [];
		const seoSeen = new Set<string>();
		const queueSeo = (href: string | null | undefined) => {
			const h = href?.trim();
			if (!h || seoSeen.has(h)) return;
			seoSeen.add(h);
			seoPrefetchOrder.push(h);
		};
		queueSeo(profileCanonicalHref);
		for (const row of sortedAnswers) {
			queueSeo(canonicalHrefByAnswerUrl[row.answer_url] ?? row.answer_url);
			if (seoPrefetchOrder.length >= MAX_SEO_PREFETCH) break;
		}

		let seoByUrl: Record<string, UrlSeoSnippet> = {};
		if (seoPrefetchOrder.length > 0) {
			try {
				seoByUrl = await fetchSeoForUrls(seoPrefetchOrder, 3, MAX_SEO_PREFETCH);
			} catch (seoErr) {
				console.error('Search SEO prefetch failed:', seoErr);
			}
		}

		return {
			site: locals.site,
			query,
			answers: sortedAnswers,
			searched: true,
			seoByUrl,
			canonicalHrefByAnswerUrl,
			glopCountByAnswerUrl,
			creatorSearchUi,
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
