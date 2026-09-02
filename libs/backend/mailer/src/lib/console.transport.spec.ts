import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AppLogger } from '@org/backend-core';
import { ConsoleMailTransport } from './console.transport';
import { OutgoingMail } from './mail.types';

function fakeLogger(): AppLogger {
  return {
    log: jest.fn(),
    warn: jest.fn(),
  } as unknown as AppLogger;
}

const message: OutgoingMail = {
  from: 'no-reply@example.test',
  to: 'user@example.test',
  subject: 'Reset your password',
  text: 'Open this link: https://app.example/reset?token=abc',
  html: '<p>Open this link</p>',
};

describe('ConsoleMailTransport', () => {
  let previewDir: string;

  beforeEach(() => {
    previewDir = mkdtempSync(join(tmpdir(), 'mailer-preview-'));
  });

  afterEach(() => {
    rmSync(previewDir, { recursive: true, force: true });
  });

  it('logs a structured line and does not throw', async () => {
    const logger = fakeLogger();
    const transport = new ConsoleMailTransport(logger, previewDir);

    await expect(transport.send(message)).resolves.toBeUndefined();

    expect(logger.log).toHaveBeenCalledTimes(1);
    const [payload, context] = (logger.log as jest.Mock).mock.calls[0];
    expect(context).toBe('MailerService');
    expect(JSON.parse(payload)).toMatchObject({
      event: 'mail.sent',
      transport: 'console',
      to: 'user@example.test',
      subject: 'Reset your password',
    });
  });

  it('drops a .eml preview file containing both bodies', async () => {
    const transport = new ConsoleMailTransport(fakeLogger(), previewDir);

    await transport.send(message);

    const files = readdirSync(previewDir).filter((f) => f.endsWith('.eml'));
    expect(files).toHaveLength(1);
    const eml = readFileSync(join(previewDir, files[0]), 'utf-8');
    expect(eml).toContain('Subject: Reset your password');
    expect(eml).toContain('https://app.example/reset?token=abc');
    expect(eml).toContain('<p>Open this link</p>');
  });

  it('swallows a preview-write failure and warns instead', async () => {
    const logger = fakeLogger();
    // Point the preview dir *at a file* → mkdirSync throws ENOTDIR.
    const asFile = join(previewDir, 'blocker');
    writeFileSync(asFile, 'not a directory');
    const transport = new ConsoleMailTransport(logger, join(asFile, 'nested'));

    await expect(transport.send(message)).resolves.toBeUndefined();
    expect(logger.log).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
