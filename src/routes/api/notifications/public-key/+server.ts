import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getVapidPublicKey } from '$lib/server/push';

export const GET: RequestHandler = async ({ platform }) => {
	return json({ publicKey: getVapidPublicKey(platform) });
};
