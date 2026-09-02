/** The subject + bodies of a templated email, ready to hand to
 * `MailerService.send({ to, ...rendered })`. */
export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Wraps body paragraphs in a tiny, inline-styled HTML shell. No template
 * engine — deliberately: the starter should not pull a rendering library
 * for three transactional emails. Swap this for MJML/Handlebars in a real
 * project if the volume grows. */
function layout(heading: string, paragraphs: string[]): string {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 16px;line-height:1.5">${p}</p>`)
    .join('');
  return [
    '<!doctype html>',
    '<html><body style="font-family:system-ui,sans-serif;color:#1a1a1a;max-width:520px;margin:0 auto;padding:24px">',
    `<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(heading)}</h1>`,
    body,
    '</body></html>',
  ].join('');
}

function link(url: string): string {
  const safe = escapeHtml(url);
  return `<a href="${safe}">${safe}</a>`;
}

export function renderPasswordReset(params: {
  url: string;
  expiresInMinutes: number;
}): RenderedEmail {
  const { url, expiresInMinutes } = params;
  return {
    subject: 'Reset your password',
    text: [
      'We received a request to reset your password.',
      '',
      `Open this link to choose a new one (valid for ${expiresInMinutes} minutes):`,
      url,
      '',
      "If you didn't request this, you can safely ignore this email.",
    ].join('\n'),
    html: layout('Reset your password', [
      'We received a request to reset your password.',
      `Click the link below to choose a new one. It is valid for ${expiresInMinutes} minutes.`,
      link(url),
      "If you didn't request this, you can safely ignore this email.",
    ]),
  };
}

export function renderEmailVerification(params: { url: string }): RenderedEmail {
  const { url } = params;
  return {
    subject: 'Verify your email address',
    text: [
      'Please confirm your email address by opening this link:',
      url,
    ].join('\n'),
    html: layout('Verify your email address', [
      'Please confirm your email address by clicking the link below.',
      link(url),
    ]),
  };
}

export function renderWelcome(params: { firstName: string }): RenderedEmail {
  const name = params.firstName.trim() || 'there';
  return {
    subject: 'Welcome aboard',
    text: `Hi ${name}, your account is ready. Thanks for signing up!`,
    html: layout('Welcome aboard', [
      `Hi ${escapeHtml(name)}, your account is ready.`,
      'Thanks for signing up!',
    ]),
  };
}
