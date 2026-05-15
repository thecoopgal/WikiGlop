import { normalizeGlopQuery } from '$lib/glop-query-normalize';
import { getDbBinding } from '$lib/server/platform-env';
import { isOmittedFromGloopglopSearch } from '$lib/server/url-public';

type Db = ReturnType<typeof getDbBinding>;

export type GlopAnswerRow = {
	id: string;
	query_display: string;
	answer_url: string;
	created_at: string;
};

function getDb(platform: App.Platform | undefined): Db {
	return getDbBinding(platform);
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
           OR instr(?, query_normalized) > 0
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

/** Glops per answer URL for one community question (search query). */
export async function fetchGlopAnswerCountsForQuestion(
	platform: App.Platform | undefined,
	siteId: string,
	queryRaw: string,
	answerUrls: string[]
): Promise<Record<string, number>> {
	const norm = normalizeGlopQuery(queryRaw);
	if (norm.length < 2) return {};

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
         WHERE site_id = ? AND query_normalized = ? AND answer_url IN (${placeholders})
         GROUP BY answer_url`
			)
			.bind(siteId, norm, ...chunk)
			.all<{ answer_url: string; cnt: number | bigint }>();

		for (const r of results ?? []) {
			const n = typeof r.cnt === 'bigint' ? Number(r.cnt) : r.cnt;
			out[r.answer_url] = Number.isFinite(n) ? n : 0;
		}
	}

	return out;
}

export type GlopQuestionRow = {
	query_normalized: string;
	query_display: string;
	first_asked_at: string;
	last_asked_at: string;
	ask_count: number;
	answer_count: number;
};

/** Records or bumps a community question when someone searches /search?q=… */
export async function recordGlopQuestionAsk(
	platform: App.Platform | undefined,
	siteId: string,
	queryRaw: string
): Promise<void> {
	const display = queryRaw.trim();
	const norm = normalizeGlopQuery(queryRaw);
	if (norm.length < 2 || display.length < 2) return;

	const db = getDb(platform);
	await db
		.prepare(
			`INSERT INTO glop_questions (site_id, query_normalized, query_display, first_asked_at, last_asked_at, ask_count)
       VALUES (?, ?, ?, datetime('now'), datetime('now'), 1)
       ON CONFLICT(site_id, query_normalized) DO UPDATE SET
         query_display = excluded.query_display,
         last_asked_at = datetime('now'),
         ask_count = ask_count + 1`
		)
		.bind(siteId, norm, display)
		.run();
}

/** Questions with at least one search and zero gloops (answers) stored. */
export async function listUnansweredGlopQuestions(
	platform: App.Platform | undefined,
	siteId: string,
	limit = 50
): Promise<GlopQuestionRow[]> {
	const db = getDb(platform);
	const cap = Math.min(Math.max(1, limit), 200);
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
       ORDER BY q.last_asked_at DESC
       LIMIT ?`
		)
		.bind(siteId, cap)
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

export type TopGlopedQuestion = {
	query_display: string;
	query_normalized: string;
	ask_count: number;
	glop_count: number;
};

/** Most-searched community questions (for /search landing with no `q`). */
export async function listTopGlopedQuestions(
	platform: App.Platform | undefined,
	siteId: string,
	limit = 10
): Promise<TopGlopedQuestion[]> {
	const db = getDb(platform);
	const cap = Math.min(Math.max(1, limit), 50);
	const { results } = await db
		.prepare(
			`SELECT
         q.query_normalized,
         q.query_display,
         q.ask_count,
         COALESCE(a.glop_count, 0) AS glop_count
       FROM glop_questions q
       LEFT JOIN (
         SELECT site_id, query_normalized, COUNT(*) AS glop_count
         FROM glop_answers
         GROUP BY site_id, query_normalized
       ) a ON a.site_id = q.site_id AND a.query_normalized = q.query_normalized
       WHERE q.site_id = ?
       ORDER BY q.ask_count DESC, COALESCE(a.glop_count, 0) DESC, q.last_asked_at DESC
       LIMIT ?`
		)
		.bind(siteId, cap)
		.all<{
			query_normalized: string;
			query_display: string;
			ask_count: number | bigint;
			glop_count: number | bigint;
		}>();

	return (results ?? []).map((r) => ({
		query_normalized: r.query_normalized,
		query_display: r.query_display,
		ask_count: Number(r.ask_count) || 0,
		glop_count: Number(r.glop_count) || 0
	}));
}

function randomId(): string {
	return `glo_${crypto.randomUUID().replace(/-/g, '')}`;
}

/** True when D1 is missing glop anti-spam tables (migrations 0006/0007 not applied). */
export function isGlopSubmissionSchemaError(e: unknown): boolean {
	const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
	return msg.includes('no such table') && msg.includes('glop_client');
}

function errorMessage(e: unknown): string {
	if (e instanceof Error) return e.message;
	if (typeof e === 'object' && e !== null && 'message' in e) {
		return String((e as { message: unknown }).message);
	}
	return String(e);
}

/** True when D1 is missing or the glop schema is not migrated. */
export function isGlopSearchDbError(e: unknown): boolean {
	const msg = errorMessage(e).toLowerCase();
	if (msg.includes('db binding')) return true;
	if (msg.includes('no such table') && msg.includes('glop')) return true;
	return false;
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
	/** Submitter chose not to be attributed publicly (anti-spam still uses client key when provided). */
	anonymous?: boolean;
}): Promise<{ id: string }> {
	const { platform, siteId, queryRaw, answerUrl, clientBrowserKey, anonymous = false } = params;
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
	const isAnonymous = anonymous ? 1 : 0;

	try {
		await recordGlopQuestionAsk(platform, siteId, queryRaw);
	} catch (questionErr) {
		console.error('Record glop question on submit failed:', questionErr);
	}

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
					`INSERT INTO glop_answers (id, site_id, query_normalized, query_display, answer_url, is_anonymous, created_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
				)
				.bind(id, siteId, norm, display, url.href, isAnonymous)
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
			`INSERT INTO glop_answers (id, site_id, query_normalized, query_display, answer_url, is_anonymous, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
		)
		.bind(id, siteId, norm, display, url.href, isAnonymous)
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
	await recordGlopQuestionAsk(platform, siteId, queryRaw);
	await db
		.prepare(
			`INSERT INTO glop_answers (id, site_id, query_normalized, query_display, answer_url, is_anonymous, created_at)
       VALUES (?, ?, ?, ?, ?, 0, datetime('now'))`
		)
		.bind(id, siteId, norm, display, url.href)
		.run();

	return 'inserted';
}
