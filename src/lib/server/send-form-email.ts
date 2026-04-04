import { env } from '$env/dynamic/private';

function privateString(name: 'RESEND_API_KEY' | 'FORM_EMAIL_FROM'): string | undefined {
	const fromKit = env[name];
	if (typeof fromKit === 'string' && fromKit.trim()) return fromKit.trim();
	if (typeof process !== 'undefined') {
		const fromProcess = process.env[name];
		if (typeof fromProcess === 'string' && fromProcess.trim()) return fromProcess.trim();
	}
	return undefined;
}

export async function sendFormNotificationEmail(opts: {
	to: string;
	subject: string;
	text: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
	const key = privateString('RESEND_API_KEY');
	if (!key) {
		return {
			ok: false,
			error:
				'Email is not configured. Add RESEND_API_KEY to a .env file in the project root (see .env.example), then restart the dev server.'
		};
	}

	const from = privateString('FORM_EMAIL_FROM') || 'WikiGlop <onboarding@resend.dev>';

	const res = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${key}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from,
			to: [opts.to],
			subject: opts.subject,
			text: opts.text
		})
	});

	if (!res.ok) {
		const errBody = await res.text();
		return { ok: false, error: errBody || `${res.status} ${res.statusText}` };
	}

	return { ok: true };
}
