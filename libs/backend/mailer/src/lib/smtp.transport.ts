import { AppLogger } from '@org/backend-core';
import { MailTransport, OutgoingMail } from './mail.types';

/** The slice of `nodemailer` this transport uses. Declared locally so the
 * brick type-checks and builds with **zero** hard dependency on the
 * package — it is loaded dynamically, only when `SMTP_URL` is set. */
interface NodemailerLike {
  createTransport(url: string): {
    sendMail(message: {
      from: string;
      to: string;
      subject: string;
      text: string;
      html?: string;
    }): Promise<unknown>;
  };
}

/**
 * SMTP delivery via `nodemailer`, active only when `SMTP_URL` is configured.
 * `nodemailer` is an **optional** dependency of this brick: install it
 * (`pnpm add nodemailer`) to use SMTP. The first `send()` resolves the
 * module and fails with an actionable message if it is missing.
 */
export class SmtpMailTransport implements MailTransport {
  private mailer: ReturnType<NodemailerLike['createTransport']> | undefined;

  constructor(
    private readonly smtpUrl: string,
    private readonly logger: AppLogger,
  ) {}

  async send(message: OutgoingMail): Promise<void> {
    const mailer = await this.resolveMailer();
    await mailer.sendMail(message);
    this.logger.log(
      JSON.stringify({
        event: 'mail.sent',
        transport: 'smtp',
        to: message.to,
        subject: message.subject,
      }),
      'MailerService',
    );
  }

  private async resolveMailer(): Promise<
    ReturnType<NodemailerLike['createTransport']>
  > {
    if (this.mailer) {
      return this.mailer;
    }

    // `moduleName` is a variable (not a string literal) on purpose: it keeps
    // TypeScript from resolving the optional dependency at build time, and
    // the `webpackIgnore` hint keeps the bundler from trying to as well —
    // `nodemailer` is resolved from `node_modules` at runtime or not at all.
    const moduleName = 'nodemailer';
    let nodemailer: NodemailerLike;
    try {
      const imported = (await import(/* webpackIgnore: true */ moduleName)) as
        | NodemailerLike
        | { default: NodemailerLike };
      nodemailer = 'default' in imported ? imported.default : imported;
    } catch {
      throw new Error(
        'SMTP_URL is set but the optional "nodemailer" package is not installed. Run `pnpm add nodemailer` to enable SMTP delivery.',
      );
    }

    this.mailer = nodemailer.createTransport(this.smtpUrl);
    return this.mailer;
  }
}
