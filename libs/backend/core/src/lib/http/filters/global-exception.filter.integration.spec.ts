import {
  Controller,
  Get,
  INestApplication,
  Module,
  NotFoundException,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppConfigService } from '../../config/app-config.service';
import { EnvironmentVariables } from '../../config/environment-variables';
import { AppLogger } from '../../logger/app-logger.service';
import { RequestContextService } from '../../logger/request-context.service';
import { RequestIdMiddleware } from '../../logger/request-id.middleware';
import { REQUEST_ID_HEADER } from '../../logger/request-id.util';
import { useRequestIdMiddleware } from '../../logger/use-request-id-middleware';
import { buildTestConfig } from '../../../testing/build-test-config';
import { listenOnRandomPort } from '../../../testing/listen-on-random-port';
import { NotFoundError } from '../errors/not-found.error';
import { GlobalExceptionFilter } from './global-exception.filter';

@Controller('probe')
class ProbeController {
  @Get('application-error')
  throwApplicationError(): never {
    throw new NotFoundError('USER_NOT_FOUND', 'User not found', {
      userId: 'abc',
    });
  }

  @Get('http-exception')
  throwHttpException(): never {
    throw new NotFoundException('Route not found');
  }

  @Get('unknown-error')
  throwUnknownError(): never {
    throw new Error('raw internal detail');
  }
}

async function createProbeApp(
  nodeEnv: EnvironmentVariables['NODE_ENV'],
): Promise<{ app: INestApplication; baseUrl: string }> {
  @Module({
    controllers: [ProbeController],
    providers: [
      RequestContextService,
      AppLogger,
      RequestIdMiddleware,
      {
        provide: AppConfigService,
        useValue: buildTestConfig({ NODE_ENV: nodeEnv }),
      },
      GlobalExceptionFilter,
    ],
  })
  class ProbeModule {}

  const app = await NestFactory.create(ProbeModule, { logger: false });
  useRequestIdMiddleware(app);
  app.useGlobalFilters(app.get(GlobalExceptionFilter));
  const baseUrl = await listenOnRandomPort(app);

  return { app, baseUrl };
}

describe('GlobalExceptionFilter (integration)', () => {
  describe('in development', () => {
    let app: INestApplication;
    let baseUrl: string;

    beforeAll(async () => {
      ({ app, baseUrl } = await createProbeApp('development'));
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns the standard error shape for an ApplicationError, with details', async () => {
      const response = await fetch(`${baseUrl}/probe/application-error`, {
        headers: { [REQUEST_ID_HEADER]: 'dev-app-error' },
      });

      expect(response.status).toBe(404);
      const body: any = await response.json();
      expect(body).toEqual({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
        message: 'User not found',
        requestId: 'dev-app-error',
        details: { userId: 'abc' },
      });
    });

    it('maps a framework HttpException', async () => {
      const response = await fetch(`${baseUrl}/probe/http-exception`, {
        headers: { [REQUEST_ID_HEADER]: 'dev-http-error' },
      });

      expect(response.status).toBe(404);
      const body: any = await response.json();
      expect(body).toEqual({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Route not found',
        requestId: 'dev-http-error',
      });
    });

    it('maps an unknown error to a generic 500 and includes debug details', async () => {
      const response = await fetch(`${baseUrl}/probe/unknown-error`, {
        headers: { [REQUEST_ID_HEADER]: 'dev-unknown-error' },
      });

      expect(response.status).toBe(500);
      const body: any = await response.json();
      expect(body.statusCode).toBe(500);
      expect(body.code).toBe('INTERNAL_SERVER_ERROR');
      expect(body.message).toBe('Internal server error');
      expect(body.requestId).toBe('dev-unknown-error');
      expect(body.details).toBeDefined();
    });
  });

  describe('in production', () => {
    let app: INestApplication;
    let baseUrl: string;

    beforeAll(async () => {
      ({ app, baseUrl } = await createProbeApp('production'));
    });

    afterAll(async () => {
      await app.close();
    });

    it('never exposes details, even for an ApplicationError', async () => {
      const response = await fetch(`${baseUrl}/probe/application-error`, {
        headers: { [REQUEST_ID_HEADER]: 'prod-app-error' },
      });

      const body: any = await response.json();
      expect(body).toEqual({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
        message: 'User not found',
        requestId: 'prod-app-error',
      });
    });

    it('never leaks the raw error message or stack for unknown errors', async () => {
      const response = await fetch(`${baseUrl}/probe/unknown-error`, {
        headers: { [REQUEST_ID_HEADER]: 'prod-unknown-error' },
      });

      expect(response.status).toBe(500);
      const body: any = await response.json();
      expect(body).toEqual({
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        requestId: 'prod-unknown-error',
      });

      const rawText = JSON.stringify(body);
      expect(rawText).not.toContain('raw internal detail');
      expect(rawText).not.toContain('.ts:');
    });
  });
});
