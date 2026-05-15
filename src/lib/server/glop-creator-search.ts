import { isGloopglopNetworkCanonicalHref } from '$lib/server/glop-answer-canonical';
import type { GlopAnswerRow } from '$lib/server/glop-search';
import type { ResolvedSite } from '$lib/server/sites';

function syntheticRowId(answerUrl: string): string {
	let h = 2166136261;
	for (let i = 0; i < answerUrl.length; i++) {
		h ^= answerUrl.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return `virt_${(h >>> 0).toString(36)}`;
}

/** Placeholder row so creator links appear before anyone gloops them manually. */
export function syntheticGlopAnswerRow(answerUrl: string, queryDisplay: string): GlopAnswerRow {
	let qd = queryDisplay.trim();
	if (qd.length < 3) qd = 'Creator page link';
	if (qd.length > 500) qd = qd.slice(0, 500);
	return {
		id: syntheticRowId(answerUrl),
		query_display: qd,
		answer_url: answerUrl,
		created_at: '1970-01-01T00:00:00.000Z'
	};
}

/**
 * When the search question names a GloopGlop creator site (site id, yaml id, or compact site name),
 * return that site so we can merge their index page + link list into results.
 */
export function findGloopglopCreatorSiteMentionedInQuery(
	normQuery: string,
	sites: ResolvedSite[]
): ResolvedSite | null {
	const q = normQuery.trim().toLowerCase();
	if (q.length < 2) return null;
	const qCompact = q.replace(/\s+/g, '');

	let best: ResolvedSite | null = null;
	let bestLen = 0;

	for (const s of sites) {
		const preset = s.theme?.preset?.trim().toLowerCase();
		if (preset !== 'gloopglop') continue;
		if (s.siteId === 'gloopglop') continue;

		const needles: string[] = [];
		const sid = s.siteId.trim().toLowerCase();
		if (sid.length >= 3) needles.push(sid);
		const id = typeof s.id === 'string' ? s.id.trim().toLowerCase() : '';
		if (id.length >= 3 && id !== sid) needles.push(id);
		const nameC = (s.name ?? '').toLowerCase().replace(/\s+/g, '');
		if (nameC.length >= 3) needles.push(nameC);

		for (const needle of needles) {
			const needleCompact = needle.replace(/\s+/g, '');
			const inSpaced = q.includes(needle);
			const inCompact = qCompact.includes(needleCompact);
			if (!inSpaced && !inCompact) continue;
			if (needle.length > bestLen) {
				bestLen = needle.length;
				best = s;
			}
		}
	}

	return best;
}

function canonicalForRow(
	row: GlopAnswerRow,
	canonicalHrefByAnswerUrl: Record<string, string>
): string {
	return canonicalHrefByAnswerUrl[row.answer_url] ?? row.answer_url;
}

function globalWeightForCanonical(
	canonical: string,
	rows: GlopAnswerRow[],
	canonicalHrefByAnswerUrl: Record<string, string>,
	globalCountByAnswerUrl: Record<string, number>
): number {
	const rawSet = new Set<string>();
	for (const r of rows) {
		if (canonicalForRow(r, canonicalHrefByAnswerUrl) === canonical) rawSet.add(r.answer_url);
	}
	let sum = 0;
	for (const raw of rawSet) {
		const n = globalCountByAnswerUrl[raw];
		sum += typeof n === 'number' && n > 0 ? n : 1;
	}
	return sum;
}

/**
 * Order canonical groups: creator profile page first (when identified), then by total glops
 * (summed across stored URLs in the group), then Gloop network, then URL string.
 */
export function sortGlopAnswersForCreatorAwareSearch(params: {
	rows: GlopAnswerRow[];
	canonicalHrefByAnswerUrl: Record<string, string>;
	profileCanonicalHref: string | null;
	globalCountByAnswerUrl: Record<string, number>;
}): GlopAnswerRow[] {
	const { rows, canonicalHrefByAnswerUrl, profileCanonicalHref, globalCountByAnswerUrl } = params;
	if (rows.length === 0) return rows;

	const canon = (r: GlopAnswerRow) => canonicalForRow(r, canonicalHrefByAnswerUrl);

	const tier = (c: string) => (profileCanonicalHref && c === profileCanonicalHref ? 0 : 1);

	const uniqueCanonicals = [...new Set(rows.map(canon))];
	uniqueCanonicals.sort((a, b) => {
		const ta = tier(a);
		const tb = tier(b);
		if (ta !== tb) return ta - tb;
		const wa = globalWeightForCanonical(a, rows, canonicalHrefByAnswerUrl, globalCountByAnswerUrl);
		const wb = globalWeightForCanonical(b, rows, canonicalHrefByAnswerUrl, globalCountByAnswerUrl);
		if (wa !== wb) return wb - wa;
		const ga = isGloopglopNetworkCanonicalHref(a);
		const gb = isGloopglopNetworkCanonicalHref(b);
		if (ga !== gb) return ga ? -1 : 1;
		return a.localeCompare(b);
	});

	const out: GlopAnswerRow[] = [];
	for (const c of uniqueCanonicals) {
		for (const r of rows) {
			if (canon(r) === c) out.push(r);
		}
	}
	return out;
}
