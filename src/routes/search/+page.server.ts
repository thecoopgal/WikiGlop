import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { buildCanonicalHrefByAnswerUrl, canonicalGlopAnswerHref } from '$lib/server/glop-answer-canonical';
import {
	findGloopglopCreatorSiteMentionedInQuery,
	sortGlopAnswersForCreatorAwareSearch,
	syntheticGlopAnswerRow
} from '$lib/server/glop-creator-search';
import { collectHttpHrefLabelsFromPage } from '$lib/server/glop-page-ingest';
import {
	fetchGlopAnswerCountsForUrls,
	searchGlopAnswers,
	type GlopAnswerRow
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

export const load: PageServerLoad = async ({ locals, url, platform }) => {
	if (locals.site?.siteId !== GLOOPGLOP_SITE_ID) {
		throw error(404, 'Not found');
	}

	const qRaw = url.searchParams.get('q') ?? '';
	const query = qRaw.trim();
	if (query.length < 2) {
		return {
			site: locals.site,
			query,
			answers: [] as GlopAnswerRow[],
			searched: false,
			seoByUrl: {} as Record<string, UrlSeoSnippet>,
			canonicalHrefByAnswerUrl: {} as Record<string, string>,
			glopGlobalCountByAnswerUrl: {} as Record<string, number>,
			creatorSearchUi: null
		};
	}

	try {
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

		if (matchedCreator) {
			const origin = publicGloopglopCreatorOriginForSearch(matchedCreator);
			if (origin) {
				const creatorBase = new URL(origin);
				const indexPage = await loadPageYaml(matchedCreator, []);
				if (indexPage) {
					const hydrated = await expandCreatorLinksShortcuts(matchedCreator, indexPage, url);
					const homeHref = new URL('/', creatorBase).href;
					profileCanonicalHref = isOmittedFromGloopglopSearch(homeHref)
						? null
						: await canonicalGlopAnswerHref(homeHref);

					const displayName = matchedCreator.name?.trim() || matchedCreator.id || matchedCreator.siteId;
					const hrefLabels = collectHttpHrefLabelsFromPage(hydrated, creatorBase, displayName);
					const homeLabel = `${displayName} · GloopGlop page`;
					if (!isOmittedFromGloopglopSearch(homeHref) && !hrefLabels.has(homeHref)) {
						hrefLabels.set(homeHref, homeLabel);
					}

					if (profileCanonicalHref) {
						const bundleCanonMap = await buildCanonicalHrefByAnswerUrl([...hrefLabels.keys()]);
						const bundleCanonicalUrls = [...new Set(Object.values(bundleCanonMap))];
						creatorSearchUi = {
							siteId: matchedCreator.siteId,
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
						const qd = `Creator link · ${label}`;
						merged.push(syntheticGlopAnswerRow(href, qd));
						added += 1;
					}
				}
			}
		}

		merged = merged.filter((r) => !isOmittedFromGloopglopSearch(r.answer_url));
		if (profileCanonicalHref && isOmittedFromGloopglopSearch(profileCanonicalHref)) {
			profileCanonicalHref = null;
		}
		if (!profileCanonicalHref) {
			creatorSearchUi = null;
		}

		const canonicalHrefByAnswerUrl =
			merged.length > 0 ? await buildCanonicalHrefByAnswerUrl(merged.map((a) => a.answer_url)) : {};

		const rawUrls = [...new Set(merged.map((r) => r.answer_url))];
		const glopGlobalCountByAnswerUrl =
			rawUrls.length > 0
				? await fetchGlopAnswerCountsForUrls(platform, locals.site.siteId, rawUrls)
				: {};

		const sortedAnswers = sortGlopAnswersForCreatorAwareSearch({
			rows: merged,
			canonicalHrefByAnswerUrl,
			profileCanonicalHref,
			globalCountByAnswerUrl: glopGlobalCountByAnswerUrl
		});

		const canonicalUrls = [...new Set(Object.values(canonicalHrefByAnswerUrl))];
		const seoByUrl =
			canonicalUrls.length > 0 ? await fetchSeoForUrls(canonicalUrls) : ({} as Record<string, UrlSeoSnippet>);
		return {
			site: locals.site,
			query,
			answers: sortedAnswers,
			searched: true,
			seoByUrl,
			canonicalHrefByAnswerUrl,
			glopGlobalCountByAnswerUrl,
			creatorSearchUi
		};
	} catch (e) {
		const isDb = e instanceof Error && e.message.includes('DB binding');
		if (isDb) {
			return {
				site: locals.site,
				query,
				answers: [] as GlopAnswerRow[],
				searched: true,
				dbUnavailable: true as const,
				seoByUrl: {} as Record<string, UrlSeoSnippet>,
				canonicalHrefByAnswerUrl: {} as Record<string, string>,
				glopGlobalCountByAnswerUrl: {} as Record<string, number>,
				creatorSearchUi: null
			};
		}
		console.error(e);
		throw error(503, 'Search is temporarily unavailable.');
	}
};
