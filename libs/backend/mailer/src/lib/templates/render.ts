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

/**
 * Transactional-email strings by locale (V2.3 step 47). No Transloco on the
 * backend — a plain dictionary is enough for two emails, and it keeps the
 * mailer brick free of a frontend dependency. Unknown locales fall back to
 * English.
 */
type EmailLocale = 'en' | 'fr';

const EMAIL_STRINGS: Record<EmailLocale, {
  reset: { subject: string; intro: string; action: (m: number) => string; ignore: string };
  verify: { subject: string; textIntro: string; htmlIntro: string };
}> = {
  en: {
    reset: {
      subject: 'Reset your password',
      intro: 'We received a request to reset your password.',
      action: (m) =>
        `Click the link below to choose a new one. It is valid for ${m} minutes.`,
      ignore: "If you didn't request this, you can safely ignore this email.",
    },
    verify: {
      subject: 'Verify your email address',
      textIntro: 'Please confirm your email address by opening this link:',
      htmlIntro:
        'Please confirm your email address by clicking the link below.',
    },
  },
  fr: {
    reset: {
      subject: 'Réinitialisez votre mot de passe',
      intro:
        'Nous avons reçu une demande de réinitialisation de votre mot de passe.',
      action: (m) =>
        `Cliquez sur le lien ci-dessous pour en choisir un nouveau. Il est valable ${m} minutes.`,
      ignore:
        "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
    },
    verify: {
      subject: 'Vérifiez votre adresse e-mail',
      textIntro:
        'Veuillez confirmer votre adresse e-mail en ouvrant ce lien :',
      htmlIntro:
        'Veuillez confirmer votre adresse e-mail en cliquant sur le lien ci-dessous.',
    },
  },
};

function stringsFor(locale: string | undefined) {
  return EMAIL_STRINGS[(locale as EmailLocale) in EMAIL_STRINGS ? (locale as EmailLocale) : 'en'];
}

export function renderPasswordReset(params: {
  url: string;
  expiresInMinutes: number;
  locale?: string;
}): RenderedEmail {
  const { url, expiresInMinutes, locale } = params;
  const t = stringsFor(locale).reset;
  return {
    subject: t.subject,
    text: [t.intro, '', t.action(expiresInMinutes), url, '', t.ignore].join(
      '\n',
    ),
    html: layout(t.subject, [t.intro, t.action(expiresInMinutes), link(url), t.ignore]),
  };
}

export function renderEmailVerification(params: {
  url: string;
  locale?: string;
}): RenderedEmail {
  const { url, locale } = params;
  const t = stringsFor(locale).verify;
  return {
    subject: t.subject,
    text: [t.textIntro, url].join('\n'),
    html: layout(t.subject, [t.htmlIntro, link(url)]),
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
