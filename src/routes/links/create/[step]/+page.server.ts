import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isLinksCreateStep } from '$lib/links-create-steps';

export const load: PageServerLoad = ({ params }) => {
	if (!isLinksCreateStep(params.step)) {
		error(404, 'Not found');
	}

	return { step: params.step };
};
