import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { readdirSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AppConfigService, AppLogger } from '@org/backend-core';
import { MailerModule } from './mailer.module';
import { MailerService } from './mailer.service';

@Global()
@Module({
  providers: [{ provide: AppLogger, useValue: { log: jest.fn(), warn: jest.fn() } }],
  exports: [AppLogger],
})
class FakeLoggerModule {}

describe('MailerModule (integration)', () => {
  it('wires MailerService with the console transport and writes an .eml', async () => {
    const previewDir = mkdtempSync(join(tmpdir(), 'mailer-smoke-'));
    const moduleRef = await Test.createTestingModule({
      imports: [FakeLoggerModule, MailerModule],
    })
      .overrideProvider(AppConfigService)
      .useValue({
        mailer: {
          smtpUrl: undefined,
          from: 'no-reply@localhost',
          previewDir,
        },
      })
      .compile();

    const mailer = moduleRef.get(MailerService);
    await expect(
      mailer.send({ to: 'x@y.test', subject: 'Smoke', text: 'body' }),
    ).resolves.toBeUndefined();

    expect(readdirSync(previewDir).filter((f) => f.endsWith('.eml'))).toHaveLength(
      1,
    );
    rmSync(previewDir, { recursive: true, force: true });
  });
});
