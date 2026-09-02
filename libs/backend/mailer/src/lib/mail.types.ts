/** A message handed to `MailerService.send()`. `from` is filled in by the
 * service from `MAIL_FROM`, so callers only provide the rest. */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** A fully-addressed message, as a `MailTransport` receives it. */
export interface OutgoingMail extends MailMessage {
  from: string;
}

/**
 * The one thing a transport must do: deliver an already-addressed message.
 * Implementations live behind the `MAIL_TRANSPORT` token so the whole
 * delivery mechanism is swappable (console by default, SMTP when
 * `SMTP_URL` is set, in-memory in tests).
 */
export interface MailTransport {
  send(message: OutgoingMail): Promise<void>;
}

/** DI token for the active `MailTransport`. */
export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');
