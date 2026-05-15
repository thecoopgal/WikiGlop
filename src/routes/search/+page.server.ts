import { getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { buildCanonicalHrefByAnswerUrl, canonicalGlopAnswerHref } from '$lib/server/glop-answer-canonical';
import {
	findGloopglopCreatorSiteMentionedInQuery,
	findGloopglopPlatformSiteMentionedInQuery,
	sortGlopAnswersForCreatorAwareSearch,
	syntheticGlopAnswerRow
} from '$lib/server/glop-creator-search';
import { collectHttpHrefLabelsFromPage } from '$lib/server/glop-page-ingest';
import {
	fetchGlopAnswerCountsForQuestion,
	isGlopSearchDbError,
	listTopGlopedQuestions,
	listUnansweredGlopQuestions,
	recordGlopQuestionAsk,
	searchGlopAnswers,
	type GlopAnswerRow,
	type GlopQuestionRow,
	type TopGlopedQuestion
} from '$lib/server/glop-search';
import { normalizeGlopQuery } from '$lib/glop-query-normalize';
import {
	expandCreatorLinksShortcuts,
	loadPageYaml,
	publicGloopglopCreatorOriginForSearch
} from '$lib/server/content';
import { getAllSites } from '$lib/server/sites';
import { fetchSeoForUrls, type UrlSeoSnippet } from '$lib/server/url-seo';
import { isOmittedFromGloopglopSearch } from '$lib/server/url-public';

const GLOOPGLOP_SITE_ID = 'gloopglop';
const MAX_CREATOR_SYNTHETIC_LINKS = 56;
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
	if (query.length < 2) {
		let topGlopedQuestions: TopGlopedQuestion[] = [];
		let unansweredGlopQuestions: GlopQuestionRow[] = [];
		try {
			topGlopedQuestions = await listTopGlopedQuestions(platform, locals.site.siteId, 10);
		} catch (topErr) {
			console.error('Top gloped questions failed (landing continues):', topErr);
		}
		try {
			unansweredGlopQuestions = await listUnansweredGlopQuestions(platform, locals.site.siteId, 10);
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
			unansweredGlopQuestions
		};
	}

	try {
		try {
			await recordGlopQuestionAsk(platform, locals.site.siteId, query);
		} catch (questionErr) {
			console.error('Record glop question failed (search continues):', questionErr);
		}

		let merged = (await searchGlopAnswers(platform, locals.site.siteId, query)).filter(
			(r) => !isOmittedFromGloopglopSearch(r.answer_url)
		);
		let profileCanonicalHref: string | null = null;
		let creatorSearchUi: {
			siteId: string;
			displayName: string;
			profileCanonicalUrl: string;
			bundleCanonicalUrls: string[];
		} | null = null;

		const norm = normalizeGlopQuery(query);
		const sites = await getAllSites();
		const matchedCreator = findGloopglopCreatorSiteMentionedInQuery(norm, sites);
		const matchedPlatform = matchedCreator
			? null
			: findGloopglopPlatformSiteMentionedInQuery(norm, sites);
		const matchedSite = matchedCreator ?? matchedPlatform;

		if (matchedSite) {
			try {
				const origin = publicGloopglopCreatorOriginForSearch(matchedSite);
				if (origin) {
					const siteBase = new URL(origin);
					const displayName = matchedSite.name?.trim() || matchedSite.id || matchedSite.siteId;
					const isPlatform = matchedSite.siteId === GLOOPGLOP_SITE_ID;
					const pageSlugLists: string[][] = isPlatform ? [[], ['creators']] : [[]];
					const hrefLabels = new Map<string, string>();

					for (const slugParts of pageSlugLists) {
						const page = await loadPageYaml(matchedSite, slugParts);
						if (!page) continue;
						const hydrated = await expandCreatorLinksShortcuts(matchedSite, page, url);
						const fromPage = collectHttpHrefLabelsFromPage(hydrated, siteBase, displayName);
						for (const [href, label] of fromPage) {
							if (!hrefLabels.has(href)) hrefLabels.set(href, label);
						}
					}

					const homeHref = new URL('/', siteBase).href;
					profileCanonicalHref = isOmittedFromGloopglopSearch(homeHref)
						? null
						: await canonicalGlopAnswerHref(homeHref);

					const homeLabel = isPlatform
						? 'GloopGlop · home'
						: `${displayName} · GloopGlop page`;
					if (!isOmittedFromGloopglopSearch(homeHref) && !hrefLabels.has(homeHref)) {
						hrefLabels.set(homeHref, homeLabel);
					}

					if (profileCanonicalHref) {
						const bundleCanonMap = await buildCanonicalHrefByAnswerUrl([...hrefLabels.keys()]);
						const bundleCanonicalUrls = [...new Set(Object.values(bundleCanonMap))];
						creatorSearchUi = {
							siteId: matchedSite.siteId,
							displayName,
							profileCanonicalUrl: profileCanonicalHref,
							bundleCanonicalUrls
						};
					}

					const existingUrls = new Set(merged.map((r) => r.answer_url));
					let added = 0;
					for (const [href, label] of hrefLabels) {
						if (added >= MAX_CREATOR_SYNTHETIC_LINKS) break;
						if (isOmittedFromGloopglopSearch(href)) continue;
						if (existingUrls.has(href)) continue;
						existingUrls.add(href);
						const qd = isPlatform ? `GloopGlop · ${label}` : `Creator link · ${label}`;
						merged.push(syntheticGlopAnswerRow(href, qd));
						added += 1;
					}
				}
			} catch (bundleErr) {
				console.error('Creator/platform search bundle failed:', bundleErr);
				profileCanonicalHref = null;
				creatorSearchUi = null;
			}
		}

		merged = merged.filter((r) => !isOmittedFromGloopglopSearch(r.answer_url));
		if (profileCanonicalHref && isOmittedFromGloopglopSearch(profileCanonicalHref)) {
			profileCanonicalHref = null;
		}
		if (!profileCanonicalHref) {
			creatorSearchUi = null;
		}

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
			unansweredGlopQuestions: [] as GlopQuestionRow[]
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
				unansweredGlopQuestions: [] as GlopQuestionRow[]
			};
		}
		throw error(503, 'Search is temporarily unavailable.');
	}
};
