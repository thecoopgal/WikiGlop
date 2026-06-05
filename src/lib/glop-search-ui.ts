import type { GlopAnswerRow } from '$lib/server/glop-search';
import type { UrlSeoSnippet } from '$lib/server/url-seo';

export type GroupedGlop = { answerUrl: string; gloopCount: number };

export function groupGlopsByCanonical(opts: {
	answers: GlopAnswerRow[];
	canonicalHrefByAnswerUrl: Record<string, string>;
	glopCountByAnswerUrl: Record<string, number>;
}): GroupedGlop[] {
	const rawByCanonical = new Map<string, Set<string>>();
	const order: string[] = [];
	const map = new Map<string, GroupedGlop>();

	for (const row of opts.answers) {
		const c = opts.canonicalHrefByAnswerUrl[row.answer_url] ?? row.answer_url;
		if (!map.has(c)) {
			map.set(c, { answerUrl: c, gloopCount: 0 });
			order.push(c);
		}
		if (!rawByCanonical.has(c)) rawByCanonical.set(c, new Set());
		rawByCanonical.get(c)!.add(row.answer_url);
	}

	for (const c of order) {
		let sum = 0;
		for (const raw of rawByCanonical.get(c) ?? []) {
			const n = opts.glopCountByAnswerUrl[raw];
			sum += typeof n === 'number' && n > 0 ? n : 0;
		}
		map.get(c)!.gloopCount = sum;
	}

	return order.map((u) => map.get(u)!);
}

/** Highest gloop-count canonical answer; ties keep the first in result order. */
export function topGlopByGloopCount(groups: GroupedGlop[]): GroupedGlop | null {
	if (!groups.length) return null;
	return groups.reduce((best, group) => (group.gloopCount > best.gloopCount ? group : best));
}

export type GlopSeoDisplay = { linkLabel: string; title: string | null; description: string | null };

function isTikTokUrl(answerUrl: string): boolean {
	try {
		const h = new URL(answerUrl).hostname.toLowerCase().replace(/^www\./, '');
		return h === 'tiktok.com' || h.endsWith('.tiktok.com');
	} catch {
		return false;
	}
}

export function glopResultDisplay(
	answerUrl: string,
	seo: Pick<UrlSeoSnippet, 'title' | 'description'> | undefined
): GlopSeoDisplay {
	const linkLabel = answerUrl;
	const skipSeo = isTikTokUrl(answerUrl);
	const rawTitle = seo?.title?.trim() ?? '';
	const title = skipSeo || !rawTitle || rawTitle === linkLabel ? null : rawTitle;
	const rawDesc = seo?.description?.trim() ?? '';
	const description = skipSeo || !rawDesc ? null : rawDesc;
	return { linkLabel, title, description };
}
