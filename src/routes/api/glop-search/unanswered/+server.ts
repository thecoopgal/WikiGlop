import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isGlopSearchDbError, listUnansweredGlopQuestions } from '$lib/server/glop-search';

const GLOOPGLOP_SITE_ID = 'gloopglop';

/** Community questions with searches but no gloops yet (for ops / content gaps). */
export const GET: RequestHandler = async ({ locals, platform, url }) => {
	if (locals.site?.siteId !== GLOOPGLOP_SITE_ID) {
		throw error(404, 'Not found');
	}

	const limitRaw = url.searchParams.get('limit');
	const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 50;

	try {
		const questions = await listUnansweredGlopQuestions(
			platform,
			locals.site.siteId,
			Number.isFinite(limit) ? limit : 50
		);
		return json({ ok: true as const, count: questions.length, questions });
	} catch (e) {
		if (isGlopSearchDbError(e)) {
			throw error(
				503,
				'Question tracking needs D1 migrations 0008 and 0009. Run npm run db:migrate:remote.'
			);
		}
		console.error('list unanswered glop questions failed:', e);
		throw error(500, 'Could not load unanswered questions.');
	}
};
