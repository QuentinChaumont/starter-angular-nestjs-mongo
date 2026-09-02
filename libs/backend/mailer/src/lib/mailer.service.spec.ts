import { AppConfigService, AppLogger } from '@org/backend-core';
import { InMemoryMailTransport } from './in-memory.transport';
import { MailerService } from './mailer.service';

function configWith(from: string): AppConfigService {
  return {
    mailer: { from, previewDir: 'tmp/mail', smtpUrl: undefined },
  } as unknown as AppConfigService;
}

const logger = { warn: jest.fn() } as unknown as AppLogger;

describe('MailerService', () => {
  it('warns at bootstrap when no SMTP_URL is configured', () => {
    const service = new MailerService(
      new InMemoryMailTransport(),
      configWith('a@b.test'),
      logger,
    );

    service.onApplicationBootstrap();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('SMTP_URL'),
      'MailerService',
    );
  });

  it('stamps the configured From address onto the outgoing message', async () => {
    const transport = new InMemoryMailTransport();
    const service = new MailerService(
      transport,
      configWith('no-reply@example.test'),
      logger,
    );

    await service.send({
      to: 'user@example.test',
      subject: 'Hello',
      text: 'Body',
    });

    expect(transport.last).toEqual({
      from: 'no-reply@example.test',
      to: 'user@example.test',
      subject: 'Hello',
      text: 'Body',
    });
  });

  it('passes an explicit html body through untouched', async () => {
    const transport = new InMemoryMailTransport();
    const service = new MailerService(transport, configWith('a@b.test'), logger);

    await service.send({
      to: 'user@example.test',
      subject: 'Hi',
      text: 'plain',
      html: '<p>rich</p>',
    });

    expect(transport.last?.html).toBe('<p>rich</p>');
  });
});
