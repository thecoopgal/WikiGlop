import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDbBinding, getWorkerBindings } from '$lib/server/platform-env';

const GLOOPGLOP_SITE_ID = 'gloopglop';

/** Production diagnostic: confirms D1 binding and `glop_answers` are reachable. */
export const GET: RequestHandler = async ({ locals, platform }) => {
	if (locals.site?.siteId !== GLOOPGLOP_SITE_ID) {
		throw error(404, 'Not found');
	}

	const bindings = getWorkerBindings(platform);
	const hasPlatform = platform != null;
	const hasEnv = bindings != null && Object.keys(bindings).length > 0;
	const hasDbBinding = bindings.DB != null;

	try {
		const db = getDbBinding(platform);
		const row = await db
			.prepare('SELECT COUNT(*) AS n FROM glop_answers WHERE site_id = ?')
			.bind(GLOOPGLOP_SITE_ID)
			.first<{ n: number | bigint }>();
		const count = row?.n != null ? Number(row.n) : 0;

		let glopQuestionCount: number | null = null;
		let unansweredQuestionCount: number | null = null;
		try {
			const qRow = await db
				.prepare('SELECT COUNT(*) AS n FROM glop_questions WHERE site_id = ?')
				.bind(GLOOPGLOP_SITE_ID)
				.first<{ n: number | bigint }>();
			glopQuestionCount = qRow?.n != null ? Number(qRow.n) : 0;

			const uRow = await db
				.prepare(
					`SELECT COUNT(*) AS n
           FROM glop_questions q
           WHERE q.site_id = ?
             AND NOT EXISTS (
               SELECT 1 FROM glop_answers a
               WHERE a.site_id = q.site_id AND a.query_normalized = q.query_normalized
             )`
				)
				.bind(GLOOPGLOP_SITE_ID)
				.first<{ n: number | bigint }>();
			unansweredQuestionCount = uRow?.n != null ? Number(uRow.n) : 0;
		} catch {
			// migrations 0008+ not applied yet
		}

		return json({
			ok: true,
			hasPlatform,
			hasEnv,
			hasDbBinding,
			glopAnswerCount: Number.isFinite(count) ? count : null,
			glopQuestionCount,
			unansweredQuestionCount
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return json(
			{
				ok: false,
				hasPlatform,
				hasEnv,
				hasDbBinding,
				error: message
			},
			{ status: 503 }
		);
	}
};
