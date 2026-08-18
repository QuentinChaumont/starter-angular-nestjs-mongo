import type { Request, Response } from 'express';
import { RequestContextService } from './request-context.service';
import { RequestIdMiddleware } from './request-id.middleware';
import { REQUEST_ID_HEADER } from './request-id.util';

describe('RequestIdMiddleware', () => {
  function createResponse() {
    return { setHeader: jest.fn() } as unknown as Response;
  }

  it('reuses an acceptable incoming request id and returns it on the response', () => {
    const requestContext = new RequestContextService();
    const middleware = new RequestIdMiddleware(requestContext);
    const req = {
      headers: { [REQUEST_ID_HEADER]: 'incoming-id' },
    } as unknown as Request;
    const res = createResponse();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, 'incoming-id');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates a request id when none is provided', () => {
    const requestContext = new RequestContextService();
    const middleware = new RequestIdMiddleware(requestContext);
    const req = { headers: {} } as unknown as Request;
    const res = createResponse();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      REQUEST_ID_HEADER,
      expect.any(String),
    );
  });

  it('makes the request id available to the rest of the request pipeline', () => {
    const requestContext = new RequestContextService();
    const middleware = new RequestIdMiddleware(requestContext);
    const req = {
      headers: { [REQUEST_ID_HEADER]: 'pipeline-id' },
    } as unknown as Request;
    const res = createResponse();

    let observedRequestId: string | undefined;
    const next = jest.fn(() => {
      observedRequestId = requestContext.requestId;
    });

    middleware.use(req, res, next);

    expect(observedRequestId).toBe('pipeline-id');
  });
});
