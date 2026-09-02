import { AppConfigService } from '@org/backend-core';
import { InMemoryMailTransport } from './in-memory.transport';
import { MailerService } from './mailer.service';

function configWith(from: string): AppConfigService {
  return {
    mailer: { from, previewDir: 'tmp/mail', smtpUrl: undefined },
  } as unknown as AppConfigService;
}

describe('MailerService', () => {
  it('stamps the configured From address onto the outgoing message', async () => {
    const transport = new InMemoryMailTransport();
    const service = new MailerService(
      transport,
      configWith('no-reply@example.test'),
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
    const service = new MailerService(transport, configWith('a@b.test'));

    await service.send({
      to: 'user@example.test',
      subject: 'Hi',
      text: 'plain',
      html: '<p>rich</p>',
    });

    expect(transport.last?.html).toBe('<p>rich</p>');
  });
});
