import { MailTransport, OutgoingMail } from './mail.types';

/**
 * Captures messages instead of delivering them, for tests. Exported from
 * `@org/backend-mailer` (rather than `@org/backend-testing`) so a workspace
 * that has the testing lib but not the mailer brick still builds.
 *
 * ```ts
 * const transport = new InMemoryMailTransport();
 * const moduleRef = await Test.createTestingModule({ ... })
 *   .overrideProvider(MAIL_TRANSPORT).useValue(transport)
 *   .compile();
 * // ...
 * expect(transport.sent).toHaveLength(1);
 * ```
 */
export class InMemoryMailTransport implements MailTransport {
  readonly sent: OutgoingMail[] = [];

  async send(message: OutgoingMail): Promise<void> {
    this.sent.push(message);
  }

  get last(): OutgoingMail | undefined {
    return this.sent[this.sent.length - 1];
  }

  clear(): void {
    this.sent.length = 0;
  }
}
