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
		return json({
			ok: true,
			hasPlatform,
			hasEnv,
			hasDbBinding,
			glopAnswerCount: Number.isFinite(count) ? count : null
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
