import { buildCanonicalHrefByAnswerUrl, canonicalGlopAnswerHref } from '$lib/server/glop-answer-canonical';
import {
	findGloopglopCreatorSiteMentionedInQuery,
	findGloopglopPlatformSiteMentionedInQuery,
	syntheticGlopAnswerRow
} from '$lib/server/glop-creator-search';
import { collectHttpHrefLabelsFromPage } from '$lib/server/glop-page-ingest';
import {
	normalizeGlopQuery,
	searchGlopAnswers,
	type GlopAnswerRow,
	type GlopQuestionRow
} from '$lib/server/glop-search';
import { getDbBinding } from '$lib/server/platform-env';
import {
	expandCreatorLinksShortcuts,
	loadPageYaml,
	publicGloopglopCreatorOriginForSearch
} from '$lib/server/content';
import { getAllSites } from '$lib/server/sites';
import { isOmittedFromGloopglopSearch } from '$lib/server/url-public';

const GLOOPGLOP_SITE_ID = 'gloopglop';
const MAX_CREATOR_SYNTHETIC_LINKS = 56;

export type GlopCreatorSearchUi = {
	siteId: string;
	displayName: string;
	profileCanonicalUrl: string;
	bundleCanonicalUrls: string[];
};

export type GlopSearchMergeResult = {
	answers: GlopAnswerRow[];
	creatorSearchUi: GlopCreatorSearchUi | null;
};

/**
 * Same merged answer list as /search?q=… (DB gloops + creator/platform page links).
 */
export async function mergeGlopSearchAnswersForQuery(params: {
	platform: App.Platform | undefined;
	siteId: string;
	queryRaw: string;
	requestUrl: URL;
}): Promise<GlopSearchMergeResult> {
	const { platform, siteId, queryRaw, requestUrl } = params;
	const query = queryRaw.trim();
	if (query.length < 2) {
		return { answers: [], creatorSearchUi: null };
	}

	let merged = (await searchGlopAnswers(platform, siteId, query)).filter(
		(r) => !isOmittedFromGloopglopSearch(r.answer_url)
	);
	let profileCanonicalHref: string | null = null;
	let creatorSearchUi: GlopCreatorSearchUi | null = null;

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
					const page = await loadPageYaml(matchedSite, slugParts, platform);
					if (!page) continue;
					const hydrated = await expandCreatorLinksShortcuts(matchedSite, page, requestUrl);
					const fromPage = collectHttpHrefLabelsFromPage(hydrated, siteBase, displayName);
					for (const [href, label] of fromPage) {
						if (!hrefLabels.has(href)) hrefLabels.set(href, label);
					}
				}

				const homeHref = new URL('/', siteBase).href;
				profileCanonicalHref = isOmittedFromGloopglopSearch(homeHref)
					? null
					: await canonicalGlopAnswerHref(homeHref);

				const homeLabel = isPlatform ? 'GloopGlop · home' : `${displayName} · GloopGlop page`;
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
			console.error('Glop search bundle merge failed:', bundleErr);
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

	return { answers: merged, creatorSearchUi };
}

export async function hasGlopSearchResults(params: {
	platform: App.Platform | undefined;
	siteId: string;
	queryRaw: string;
	requestUrl: URL;
}): Promise<boolean> {
	const { answers } = await mergeGlopSearchAnswersForQuery(params);
	return answers.length > 0;
}

export type UnansweredGlopSort = 'recent' | 'searches';

export function parseUnansweredGlopSort(raw: string | null | undefined): UnansweredGlopSort {
	return raw === 'searches' ? 'searches' : 'recent';
}

function sortUnansweredGlopQuestions(
	rows: GlopQuestionRow[],
	sort: UnansweredGlopSort
): GlopQuestionRow[] {
	const copy = [...rows];
	if (sort === 'searches') {
		copy.sort((a, b) => {
			if (b.ask_count !== a.ask_count) return b.ask_count - a.ask_count;
			return b.last_asked_at.localeCompare(a.last_asked_at);
		});
	} else {
		copy.sort((a, b) => b.last_asked_at.localeCompare(a.last_asked_at));
	}
	return copy;
}

/** Questions with at least one search and zero gloops (exact query_normalized only). */
async function listUnansweredGlopQuestionCandidates(
	platform: App.Platform | undefined,
	siteId: string,
	limit: number,
	sort: UnansweredGlopSort
): Promise<GlopQuestionRow[]> {
	const db = getDbBinding(platform);
	const orderBy =
		sort === 'searches'
			? 'q.ask_count DESC, q.last_asked_at DESC'
			: 'q.last_asked_at DESC';
	const { results } = await db
		.prepare(
			`SELECT
         q.query_normalized,
         q.query_display,
         q.first_asked_at,
         q.last_asked_at,
         q.ask_count,
         COALESCE(a.answer_count, 0) AS answer_count
       FROM glop_questions q
       LEFT JOIN (
         SELECT site_id, query_normalized, COUNT(*) AS answer_count
         FROM glop_answers
         GROUP BY site_id, query_normalized
       ) a ON a.site_id = q.site_id AND a.query_normalized = q.query_normalized
       WHERE q.site_id = ?
         AND COALESCE(a.answer_count, 0) = 0
       ORDER BY ${orderBy}
       LIMIT ?`
		)
		.bind(siteId, limit)
		.all<{
			query_normalized: string;
			query_display: string;
			first_asked_at: string;
			last_asked_at: string;
			ask_count: number | bigint;
			answer_count: number | bigint;
		}>();

	return (results ?? []).map((r) => ({
		query_normalized: r.query_normalized,
		query_display: r.query_display,
		first_asked_at: r.first_asked_at,
		last_asked_at: r.last_asked_at,
		ask_count: Number(r.ask_count) || 0,
		answer_count: Number(r.answer_count) || 0
	}));
}

/**
 * Questions with no searchable glops — same merge rules as /search
 * (fuzzy DB match, auto-ingested page links, creator/platform bundles).
 */
export async function listUnansweredGlopQuestions(
	platform: App.Platform | undefined,
	siteId: string,
	requestUrl: URL,
	limit = 10,
	sort: UnansweredGlopSort = 'recent'
): Promise<GlopQuestionRow[]> {
	const cap = Math.min(Math.max(1, limit), 50);
	const scanCap = Math.min(cap * 5, 50);

	const candidates = await listUnansweredGlopQuestionCandidates(platform, siteId, scanCap, sort);
	const out: GlopQuestionRow[] = [];

	for (const row of candidates) {
		if (out.length >= cap) break;
		// eslint-disable-next-line no-await-in-loop
		const hasResults = await hasGlopSearchResults({
			platform,
			siteId,
			queryRaw: row.query_display,
			requestUrl
		});
		if (!hasResults) out.push(row);
	}

	return sortUnansweredGlopQuestions(out, sort).slice(0, cap);
}
