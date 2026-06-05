import { buildCanonicalHrefByAnswerUrl } from '$lib/server/glop-answer-canonical';
import { sortGlopAnswersForCreatorAwareSearch } from '$lib/server/glop-creator-search';
import {
	fetchGlopAnswerCountsForQuestion,
	isGlopSearchDbError,
	recordGlopQuestionAsk,
	type GlopAnswerRow
} from '$lib/server/glop-search';
import { mergeGlopSearchAnswersForQuery, type GlopCreatorSearchUi } from '$lib/server/glop-search-resolve';
import { fetchSeoForUrls, type UrlSeoSnippet } from '$lib/server/url-seo';

/** Cap outbound SEO fetches so search stays under Workers subrequest limits. */
const MAX_SEO_PREFETCH = 12;

export type GlopSearchQueryPayload = {
	query: string;
	answers: GlopAnswerRow[];
	seoByUrl: Record<string, UrlSeoSnippet>;
	canonicalHrefByAnswerUrl: Record<string, string>;
	glopCountByAnswerUrl: Record<string, number>;
	creatorSearchUi: GlopCreatorSearchUi | null;
	dbUnavailable?: true;
};

/** Shared search logic for /search and GET /api/glop-search. */
export async function runGlopSearchQuery(opts: {
	platform: App.Platform | undefined;
	siteId: string;
	queryRaw: string;
	requestUrl: URL;
	recordAsk?: boolean;
}): Promise<GlopSearchQueryPayload> {
	const query = opts.queryRaw.trim();
	if (query.length < 2) {
		return {
			query,
			answers: [],
			seoByUrl: {},
			canonicalHrefByAnswerUrl: {},
			glopCountByAnswerUrl: {},
			creatorSearchUi: null
		};
	}

	try {
		if (opts.recordAsk !== false) {
			try {
				await recordGlopQuestionAsk(opts.platform, opts.siteId, query);
			} catch (questionErr) {
				console.error('Record glop question failed (search continues):', questionErr);
			}
		}

		const { answers: merged, creatorSearchUi } = await mergeGlopSearchAnswersForQuery({
			platform: opts.platform,
			siteId: opts.siteId,
			queryRaw: query,
			requestUrl: opts.requestUrl
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
					opts.platform,
					opts.siteId,
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
			query,
			answers: sortedAnswers,
			seoByUrl,
			canonicalHrefByAnswerUrl,
			glopCountByAnswerUrl,
			creatorSearchUi
		};
	} catch (e) {
		console.error('Glop search query failed:', e);
		if (isGlopSearchDbError(e)) {
			return {
				query,
				answers: [],
				seoByUrl: {},
				canonicalHrefByAnswerUrl: {},
				glopCountByAnswerUrl: {},
				creatorSearchUi: null,
				dbUnavailable: true
			};
		}
		throw e;
	}
}
