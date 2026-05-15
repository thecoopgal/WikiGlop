import { normalizeGlopQuery } from '$lib/glop-query-normalize';
import { isOmittedFromGloopglopSearch } from '$lib/server/url-public';

type Db = NonNullable<GlopSearchEnv['DB']>;

type GlopSearchEnv = {
	DB?: {
		prepare(query: string): {
			bind(...values: unknown[]): {
				first<T = Record<string, unknown>>(): Promise<T | null>;
				all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
				run(): Promise<unknown>;
			};
		};
	};
};

export type GlopAnswerRow = {
	id: string;
	query_display: string;
	answer_url: string;
	created_at: string;
};

function extractEnv(platform: App.Platform | undefined): GlopSearchEnv {
	return (((platform as { env?: GlopSearchEnv } | undefined)?.env as GlopSearchEnv | undefined) ??
		{}) as GlopSearchEnv;
}

function getDb(platform: App.Platform | undefined): Db {
	const env = extractEnv(platform);
	if (!env.DB) throw new Error('DB binding is not configured');
	return env.DB;
}

export { normalizeGlopQuery } from '$lib/glop-query-normalize';

export async function searchGlopAnswers(
	platform: App.Platform | undefined,
	siteId: string,
	queryRaw: string
): Promise<GlopAnswerRow[]> {
	const norm = normalizeGlopQuery(queryRaw);
	if (norm.length < 2) return [];

	const db = getDb(platform);
	const { results } = await db
		.prepare(
			`SELECT id, query_display, answer_url, created_at
       FROM glop_answers
       WHERE site_id = ?
         AND (
           query_normalized = ?
           OR query_normalized LIKE '%' || ? || '%'
           OR ? LIKE '%' || query_normalized || '%'
         )
       ORDER BY
         CASE WHEN query_normalized = ? THEN 0 ELSE 1 END,
         LENGTH(query_normalized) ASC,
         datetime(created_at) DESC
       LIMIT 40`
		)
		.bind(siteId, norm, norm, norm, norm)
		.all<GlopAnswerRow>();

	return results ?? [];
}

/** Total `glop_answers` rows per stored `answer_url` (any question), for upvote-style badges. */
export async function fetchGlopAnswerCountsForUrls(
	platform: App.Platform | undefined,
	siteId: string,
	answerUrls: string[]
): Promise<Record<string, number>> {
	const out: Record<string, number> = {};
	const unique = [...new Set(answerUrls.map((x) => x.trim()).filter(Boolean))];
	if (unique.length === 0) return out;

	const db = getDb(platform);
	const chunkSize = 60;
	for (let i = 0; i < unique.length; i += chunkSize) {
		const chunk = unique.slice(i, i + chunkSize);
		const placeholders = chunk.map(() => '?').join(',');
		// eslint-disable-next-line no-await-in-loop
		const { results } = await db
			.prepare(
				`SELECT answer_url, COUNT(*) as cnt
         FROM glop_answers
         WHERE site_id = ? AND answer_url IN (${placeholders})
         GROUP BY answer_url`
			)
			.bind(siteId, ...chunk)
			.all<{ answer_url: string; cnt: number | bigint }>();

		for (const r of results ?? []) {
			const n = typeof r.cnt === 'bigint' ? Number(r.cnt) : r.cnt;
			out[r.answer_url] = Number.isFinite(n) ? n : 0;
		}
	}

	return out;
}

function randomId(): string {
	return `glo_${crypto.randomUUID().replace(/-/g, '')}`;
}

/** True when D1 is missing glop anti-spam tables (migrations 0006/0007 not applied). */
export function isGlopSubmissionSchemaError(e: unknown): boolean {
	const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
	return msg.includes('no such table') && msg.includes('glop_client');
}

/**
 * Parses `http`/`https` links and bare host/path input (e.g. `gloop.gg/foo`,
 * `creator.gloopglop.com`, `//gloop.gg/...`) so URLs match how people paste from GloopGlop.
 */
export function parseGlopAnswerUrl(raw: string): URL | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	let candidate = trimmed;
	if (candidate.startsWith('//')) {
		candidate = `https:${candidate}`;
	} else if (!/^[a-z][a-z0-9+.-]*:/i.test(candidate)) {
		candidate = `https://${candidate}`;
	}
	try {
		const u = new URL(candidate);
		if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
		return u;
	} catch {
		return null;
	}
}

/** Validates anonymous browser id from POST /api/glop-search (stored with question for one-glop-per-browser). */
export function assertValidBrowserClientKey(raw: unknown): string {
	if (typeof raw !== 'string') {
		throw new Error('This browser must send a client id to post a glop.');
	}
	const t = raw.trim();
	if (!/^gg_[0-9a-f]{32}$/.test(t)) {
		throw new Error('Invalid browser client id.');
	}
	return t;
}

export async function insertGlopAnswer(params: {
	platform: App.Platform | undefined;
	siteId: string;
	queryRaw: string;
	answerUrl: string;
	/** When set (GloopGlop manual add), enforces one submission per (question, url) per browser. */
	clientBrowserKey?: string;
}): Promise<{ id: string }> {
	const { platform, siteId, queryRaw, answerUrl, clientBrowserKey } = params;
	const display = queryRaw.trim();
	if (display.length < 3 || display.length > 500) {
		throw new Error('Question must be between 3 and 500 characters.');
	}
	const norm = normalizeGlopQuery(queryRaw);
	if (norm.length < 3) {
		throw new Error('Question must be between 3 and 500 characters.');
	}

	const url = parseGlopAnswerUrl(answerUrl);
	if (!url || url.href.length > 2048) {
		throw new Error(
			'Please enter a valid link — https://… or a bare Gloop host like gloop.gg/… or yourname.gloopglop.com/…'
		);
	}
	if (isOmittedFromGloopglopSearch(url.href)) {
		throw new Error('Local and loopback hosts are not allowed for community search.');
	}

	const db = getDb(platform);
	const id = randomId();

	if (clientBrowserKey !== undefined && clientBrowserKey !== '') {
		const clientKey = assertValidBrowserClientKey(clientBrowserKey);
		try {
			await db
				.prepare(
					`INSERT INTO glop_client_question_url_submissions (site_id, query_normalized, client_key, answer_url)
           VALUES (?, ?, ?, ?)`
				)
				.bind(siteId, norm, clientKey, url.href)
				.run();
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			if (msg.includes('UNIQUE constraint') || msg.toLowerCase().includes('unique')) {
				throw new Error('You already added this link for this question from this browser.');
			}
			throw e;
		}
		try {
			await db
				.prepare(
					`INSERT INTO glop_answers (id, site_id, query_normalized, query_display, answer_url, created_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))`
				)
				.bind(id, siteId, norm, display, url.href)
				.run();
		} catch (e) {
			await db
				.prepare(
					`DELETE FROM glop_client_question_url_submissions
           WHERE site_id = ? AND query_normalized = ? AND client_key = ? AND answer_url = ?`
				)
				.bind(siteId, norm, clientKey, url.href)
				.run();
			throw e;
		}
		return { id };
	}

	await db
		.prepare(
			`INSERT INTO glop_answers (id, site_id, query_normalized, query_display, answer_url, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
		)
		.bind(id, siteId, norm, display, url.href)
		.run();

	return { id };
}

/**
 * Inserts a row only when this `answer_url` is not already stored for the site
 * (same normalized href string as `insertGlopAnswer`).
 */
export async function insertGlopAnswerIfAbsent(params: {
	platform: App.Platform | undefined;
	siteId: string;
	queryRaw: string;
	answerUrl: string;
}): Promise<'inserted' | 'skipped' | 'invalid'> {
	const { platform, siteId, queryRaw, answerUrl } = params;
	const display = queryRaw.trim();
	if (display.length < 3 || display.length > 500) return 'invalid';
	const norm = normalizeGlopQuery(queryRaw);
	if (norm.length < 3) return 'invalid';

	const url = parseGlopAnswerUrl(answerUrl);
	if (!url || url.href.length > 2048) return 'invalid';
	if (isOmittedFromGloopglopSearch(url.href)) return 'invalid';

	const db = getDb(platform);
	const hit = await db
		.prepare(`SELECT id FROM glop_answers WHERE site_id = ? AND answer_url = ? LIMIT 1`)
		.bind(siteId, url.href)
		.first<{ id: string }>();
	if (hit) return 'skipped';

	const id = randomId();
	await db
		.prepare(
			`INSERT INTO glop_answers (id, site_id, query_normalized, query_display, answer_url, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
		)
		.bind(id, siteId, norm, display, url.href)
		.run();

	return 'inserted';
}
