import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { ApiOkResponse, ApiProperty } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppConfigService } from '../config/app-config.service';
import { EnvironmentVariables } from '../config/environment-variables';
import { OPENAPI_PATH, setupOpenApi } from './setup-openapi';

class ProbeResponseDto {
  @ApiProperty({ example: 'hello' })
  greeting!: string;
}

@Controller('probe')
class ProbeController {
  @Get()
  @ApiOkResponse({ type: ProbeResponseDto })
  probe(): ProbeResponseDto {
    return { greeting: 'hello' };
  }
}

function buildConfig(
  nodeEnv: EnvironmentVariables['NODE_ENV'],
): AppConfigService {
  return new AppConfigService(
    new ConfigService<EnvironmentVariables, true>({
      NODE_ENV: nodeEnv,
      PORT: 3000,
      CORS_ORIGINS: ['http://localhost:4200'],
    }),
  );
}

async function createProbeApp(
  nodeEnv: EnvironmentVariables['NODE_ENV'],
): Promise<{ app: INestApplication; baseUrl: string }> {
  @Module({
    controllers: [ProbeController],
    providers: [{ provide: AppConfigService, useValue: buildConfig(nodeEnv) }],
  })
  class ProbeModule {}

  const app = await NestFactory.create(ProbeModule, { logger: false });
  setupOpenApi(app);
  await app.listen(0);

  const address = app.getHttpServer().address();
  const port = typeof address === 'object' && address ? address.port : 0;

  return { app, baseUrl: `http://127.0.0.1:${port}` };
}

describe('setupOpenApi (integration)', () => {
  describe('in development', () => {
    let app: INestApplication;
    let baseUrl: string;

    beforeAll(async () => {
      ({ app, baseUrl } = await createProbeApp('development'));
    });

    afterAll(async () => {
      await app.close();
    });

    it('serves the Swagger UI', async () => {
      const response = await fetch(`${baseUrl}/${OPENAPI_PATH}`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
    });

    it('serves the OpenAPI JSON document with the test DTO documented', async () => {
      const response = await fetch(`${baseUrl}/${OPENAPI_PATH}-json`);
      expect(response.status).toBe(200);

      const document = await response.json();
      expect(document.paths['/probe'].get).toBeDefined();
      expect(document.components.schemas['ProbeResponseDto']).toEqual(
        expect.objectContaining({
          properties: expect.objectContaining({
            greeting: expect.objectContaining({
              type: 'string',
              example: 'hello',
            }),
          }),
        }),
      );
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

    it('does not mount the Swagger UI', async () => {
      const response = await fetch(`${baseUrl}/${OPENAPI_PATH}`);
      expect(response.status).toBe(404);
    });

    it('does not mount the OpenAPI JSON document', async () => {
      const response = await fetch(`${baseUrl}/${OPENAPI_PATH}-json`);
      expect(response.status).toBe(404);
    });
  });
});
