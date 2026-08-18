import {
  Body,
  Controller,
  Get,
  INestApplication,
  Module,
  Post,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Type } from 'class-transformer';
import { IsEmail, IsInt, Min } from 'class-validator';
import { AppConfigService } from '../../config/app-config.service';
import { EnvironmentVariables } from '../../config/environment-variables';
import { AppLogger } from '../../logger/app-logger.service';
import { RequestContextService } from '../../logger/request-context.service';
import { RequestIdMiddleware } from '../../logger/request-id.middleware';
import { REQUEST_ID_HEADER } from '../../logger/request-id.util';
import { useRequestIdMiddleware } from '../../logger/use-request-id-middleware';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';
import { createValidationPipe } from './create-validation-pipe';

class CreateProbeDto {
  @IsEmail()
  email!: string;
}

class ListQueryDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page!: number;
}

@Controller('probe')
class ProbeController {
  @Post()
  create(@Body() dto: CreateProbeDto) {
    return dto;
  }

  @Get()
  list(@Query() query: ListQueryDto) {
    return { page: query.page, pageType: typeof query.page };
  }
}

function buildConfig(): AppConfigService {
  return new AppConfigService(
    new ConfigService<EnvironmentVariables, true>({
      NODE_ENV: 'development',
      PORT: 3000,
      CORS_ORIGINS: ['http://localhost:4200'],
    }),
  );
}

describe('Global input validation (integration)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    @Module({
      controllers: [ProbeController],
      providers: [
        RequestContextService,
        AppLogger,
        RequestIdMiddleware,
        { provide: AppConfigService, useValue: buildConfig() },
        GlobalExceptionFilter,
      ],
    })
    class ProbeModule {}

    app = await NestFactory.create(ProbeModule, { logger: false });
    useRequestIdMiddleware(app);
    app.useGlobalFilters(app.get(GlobalExceptionFilter));
    app.useGlobalPipes(createValidationPipe());
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a valid payload', async () => {
    const response = await fetch(`${baseUrl}/probe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com' }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ email: 'user@example.com' });
  });

  it('rejects an invalid payload with the standard error format', async () => {
    const response = await fetch(`${baseUrl}/probe`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [REQUEST_ID_HEADER]: 'validation-invalid',
      },
      body: JSON.stringify({ email: 'not-an-email' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      requestId: 'validation-invalid',
      details: [{ field: 'email', errors: [expect.any(String)] }],
    });
  });

  it('rejects unknown properties', async () => {
    const response = await fetch(`${baseUrl}/probe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        isAdmin: true,
      }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('transforms query parameters to their declared type', async () => {
    const response = await fetch(`${baseUrl}/probe?page=2`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ page: 2, pageType: 'number' });
  });

  it('rejects an out-of-range transformed query parameter', async () => {
    const response = await fetch(`${baseUrl}/probe?page=0`);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });
});
