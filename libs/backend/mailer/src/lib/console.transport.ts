import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AppLogger } from '@org/backend-core';
import { MailTransport, OutgoingMail } from './mail.types';

const BODY_PREVIEW_LENGTH = 200;

/**
 * The default transport: no network, nothing to configure. Logs a
 * structured line via `AppLogger` and drops a `.eml` preview file into
 * `previewDir` so the full message (including HTML) can be inspected or
 * opened in a mail client during local dev.
 *
 * Never throws — a preview-write failure (read-only fs, CI) is logged and
 * swallowed, so a missing `.eml` can't break a request flow.
 */
export class ConsoleMailTransport implements MailTransport {
  constructor(
    private readonly logger: AppLogger,
    private readonly previewDir: string,
  ) {}

  async send(message: OutgoingMail): Promise<void> {
    const preview = message.text.slice(0, BODY_PREVIEW_LENGTH);
    this.logger.log(
      JSON.stringify({
        event: 'mail.sent',
        transport: 'console',
        to: message.to,
        from: message.from,
        subject: message.subject,
        bodyPreview: preview,
        truncated: message.text.length > BODY_PREVIEW_LENGTH,
      }),
      'MailerService',
    );

    this.writePreview(message);
  }

  private writePreview(message: OutgoingMail): void {
    try {
      mkdirSync(this.previewDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = join(this.previewDir, `${stamp}-${sanitize(message.to)}.eml`);
      writeFileSync(file, renderEml(message));
    } catch (error) {
      this.logger.warn(
        `Could not write mail preview to "${this.previewDir}": ${
          error instanceof Error ? error.message : String(error)
        }`,
        'MailerService',
      );
    }
  }
}

function sanitize(value: string): string {
  return value.replace(/[^a-z0-9._-]+/gi, '_');
}

/** A minimal RFC-822-ish message, enough for a mail client to open it. */
function renderEml(message: OutgoingMail): string {
  const headers = [
    `From: ${message.from}`,
    `To: ${message.to}`,
    `Subject: ${message.subject}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
  ];

  if (message.html) {
    const boundary = `----=_Part_${Date.now()}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    return [
      headers.join('\r\n'),
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      message.text,
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      message.html,
      `--${boundary}--`,
      '',
    ].join('\r\n');
  }

  headers.push('Content-Type: text/plain; charset=utf-8');
  return [headers.join('\r\n'), '', message.text, ''].join('\r\n');
}
