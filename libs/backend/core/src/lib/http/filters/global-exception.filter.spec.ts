import type { AppConfigService } from '../../config';
import { ArgumentsHost, NotFoundException } from '@nestjs/common';
import { AppLogger } from '../../logger/app-logger.service';
import { RequestContextService } from '../../logger/request-context.service';
import { buildTestConfig as buildConfig } from '../../../testing/build-test-config';
import { NotFoundError } from '../errors/not-found.error';
import { GlobalExceptionFilter } from './global-exception.filter';

function buildHost() {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, response };
}

describe('GlobalExceptionFilter', () => {
  function buildFilter(config: AppConfigService, requestId?: string) {
    const requestContext = new RequestContextService();
    const logger = new AppLogger(requestContext);
    jest.spyOn(logger, 'error').mockImplementation();
    jest.spyOn(logger, 'warn').mockImplementation();

    const filter = new GlobalExceptionFilter(logger, requestContext, config);

    return { filter, requestContext, logger, requestId };
  }

  function catchWithinRequest(
    filter: GlobalExceptionFilter,
    requestContext: RequestContextService,
    requestId: string | undefined,
    exception: unknown,
    host: ArgumentsHost,
  ) {
    if (requestId === undefined) {
      filter.catch(exception, host);
      return;
    }
    requestContext.run({ requestId }, () => filter.catch(exception, host));
  }

  it('maps an ApplicationError to its own status/code/message and includes the requestId', () => {
    const { filter, requestContext } = buildFilter(buildConfig());
    const { host, response } = buildHost();

    catchWithinRequest(
      filter,
      requestContext,
      'req-1',
      new NotFoundError('USER_NOT_FOUND', 'User not found'),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
        message: 'User not found',
        requestId: 'req-1',
      }),
    );
  });

  it('maps a Nest HttpException using its status and message', () => {
    const { filter, requestContext } = buildFilter(buildConfig());
    const { host, response } = buildHost();

    catchWithinRequest(
      filter,
      requestContext,
      'req-2',
      new NotFoundException('Route not found'),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Route not found',
        requestId: 'req-2',
      }),
    );
  });

  it('maps an unknown error to a generic 500 without leaking its message', () => {
    const { filter, requestContext } = buildFilter(
      buildConfig({ NODE_ENV: 'production' }),
    );
    const { host, response } = buildHost();

    catchWithinRequest(
      filter,
      requestContext,
      'req-3',
      new Error('raw internal detail'),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        requestId: 'req-3',
      }),
    );

    const [body] = response.json.mock.calls[0];
    expect(JSON.stringify(body)).not.toContain('raw internal detail');
  });

  it('includes details in development', () => {
    const { filter, requestContext } = buildFilter(
      buildConfig({ NODE_ENV: 'development' }),
    );
    const { host, response } = buildHost();

    catchWithinRequest(
      filter,
      requestContext,
      'req-4',
      new Error('boom'),
      host,
    );

    const [body] = response.json.mock.calls[0];
    expect(body.details).toBeDefined();
  });

  it('never includes details in production', () => {
    const { filter, requestContext } = buildFilter(
      buildConfig({ NODE_ENV: 'production' }),
    );
    const { host, response } = buildHost();

    catchWithinRequest(
      filter,
      requestContext,
      'req-5',
      new NotFoundError('USER_NOT_FOUND', 'User not found', {
        userId: 'abc',
      }),
      host,
    );

    const [body] = response.json.mock.calls[0];
    expect(body.details).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('abc');
  });

  it('logs the original error server-side', () => {
    const { filter, requestContext, logger } = buildFilter(buildConfig());
    const { host } = buildHost();
    const originalError = new Error('boom');

    catchWithinRequest(filter, requestContext, 'req-6', originalError, host);

    expect(logger.error).toHaveBeenCalledWith(
      'boom',
      expect.any(String),
    );
  });

  it('logs 4xx application errors as warnings, not errors', () => {
    const { filter, requestContext, logger } = buildFilter(buildConfig());
    const { host } = buildHost();

    catchWithinRequest(
      filter,
      requestContext,
      'req-7',
      new NotFoundError('USER_NOT_FOUND', 'User not found'),
      host,
    );

    expect(logger.warn).toHaveBeenCalledWith('User not found');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('has no requestId in the body when there is no active request context', () => {
    const { filter, requestContext } = buildFilter(buildConfig());
    const { host, response } = buildHost();

    catchWithinRequest(
      filter,
      requestContext,
      undefined,
      new NotFoundError('USER_NOT_FOUND', 'User not found'),
      host,
    );

    const [body] = response.json.mock.calls[0];
    expect(body.requestId).toBeUndefined();
  });
});
