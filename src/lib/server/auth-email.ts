import { GLOOPGLOP_DEFAULT_LOGO_URL } from '$lib/glop-link-image';
import { getWorkerBindings } from '$lib/server/platform-env';

type SendEmailBinding = {
	send(message: {
		to: string;
		from: { email: string; name?: string } | string;
		subject: string;
		html: string;
		text: string;
	}): Promise<{ messageId?: string }>;
};

function getEmailBinding(platform: App.Platform | undefined): SendEmailBinding | null {
	const bindings = getWorkerBindings(platform);
	const email = bindings.EMAIL;
	if (!email || typeof email !== 'object') return null;
	if (typeof (email as SendEmailBinding).send !== 'function') return null;
	return email as SendEmailBinding;
}

function fromAddress(platform: App.Platform | undefined): { email: string; name: string } {
	const bindings = getWorkerBindings(platform);
	const email =
		typeof bindings.AUTH_FROM_EMAIL === 'string' && bindings.AUTH_FROM_EMAIL.trim()
			? bindings.AUTH_FROM_EMAIL.trim()
			: 'login@gloop.gg';
	const name =
		typeof bindings.AUTH_FROM_NAME === 'string' && bindings.AUTH_FROM_NAME.trim()
			? bindings.AUTH_FROM_NAME.trim()
			: 'GloopGlop';
	return { email, name };
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function buildMagicLinkCopy(isExistingUser: boolean): {
	subject: string;
	heading: string;
	intro: string;
	buttonLabel: string;
} {
	if (isExistingUser) {
		return {
			subject: 'Welcome back to GloopGlop',
			heading: 'Welcome back',
			intro: 'Use the button below to sign in. This link expires in 15 minutes.',
			buttonLabel: 'Sign in'
		};
	}
	return {
		subject: 'Welcome to GloopGlop',
		heading: 'Welcome',
		intro: 'Use the button below to finish signing up. This link expires in 15 minutes.',
		buttonLabel: 'Get started'
	};
}

function buildMagicLinkHtml(opts: {
	magicLinkUrl: string;
	heading: string;
	intro: string;
	buttonLabel: string;
}): string {
	const url = escapeHtml(opts.magicLinkUrl);
	const heading = escapeHtml(opts.heading);
	const intro = escapeHtml(opts.intro);
	const buttonLabel = escapeHtml(opts.buttonLabel);
	const logo = escapeHtml(GLOOPGLOP_DEFAULT_LOGO_URL);

	// Table-based layout for broad email-client support.
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>GloopGlop</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td align="center" style="padding:32px 32px 8px;">
              <img src="${logo}" width="64" height="64" alt="GloopGlop" style="display:block;border:0;border-radius:9999px;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 32px 0;">
              <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:700;color:#111827;">${heading}</h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:12px 32px 0;">
              <p style="margin:0;font-size:15px;line-height:1.5;color:#4b5563;">${intro}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 32px 8px;">
              <a href="${url}" style="display:inline-block;background-color:#7ac943;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:10px;border:1px solid #5f9626;">${buttonLabel}</a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 32px 0;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">If the button does not work, copy and paste this link:</p>
              <p style="margin:8px 0 0;font-size:12px;line-height:1.5;word-break:break-all;"><a href="${url}" style="color:#5f9626;text-decoration:underline;">${url}</a></p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 32px 32px;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">If you did not request this, you can ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildMagicLinkText(opts: {
	magicLinkUrl: string;
	heading: string;
	intro: string;
}): string {
	return [
		opts.heading,
		'',
		opts.intro,
		'',
		opts.magicLinkUrl,
		'',
		'If you did not request this, you can ignore this email.'
	].join('\n');
}

export async function sendMagicLinkEmail(
	platform: App.Platform | undefined,
	opts: { to: string; magicLinkUrl: string; isExistingUser: boolean }
): Promise<{ sent: boolean; devLogged?: boolean }> {
	const from = fromAddress(platform);
	const copy = buildMagicLinkCopy(opts.isExistingUser);
	const html = buildMagicLinkHtml({
		magicLinkUrl: opts.magicLinkUrl,
		heading: copy.heading,
		intro: copy.intro,
		buttonLabel: copy.buttonLabel
	});
	const text = buildMagicLinkText({
		magicLinkUrl: opts.magicLinkUrl,
		heading: copy.heading,
		intro: copy.intro
	});

	const email = getEmailBinding(platform);
	if (!email) {
		// Plain `vite dev` has no EMAIL binding — log so local testing still works.
		console.info(
			'[auth] EMAIL binding missing; magic link for',
			opts.to,
			opts.isExistingUser ? '(existing)' : '(new)',
			opts.magicLinkUrl
		);
		return { sent: false, devLogged: true };
	}

	try {
		const result = await email.send({
			to: opts.to,
			from: { email: from.email, name: from.name },
			subject: copy.subject,
			html,
			text
		});
		console.info('[auth] magic-link email sent', {
			to: opts.to,
			existing: opts.isExistingUser,
			result
		});
		return { sent: true };
	} catch (e) {
		console.error('[auth] magic-link email send failed:', e);
		throw e;
	}
}
