import { INestApplication } from '@nestjs/common';
import { RequestIdMiddleware } from './request-id.middleware';
import { useRequestIdMiddleware } from './use-request-id-middleware';

describe('useRequestIdMiddleware', () => {
  it('registers the middleware as raw Express middleware on the app', () => {
    const middlewareInstance = { use: jest.fn() };
    const app = {
      get: jest.fn().mockReturnValue(middlewareInstance),
      use: jest.fn(),
    } as unknown as INestApplication;

    useRequestIdMiddleware(app);

    expect(app.get).toHaveBeenCalledWith(RequestIdMiddleware);
    expect(app.use).toHaveBeenCalledTimes(1);

    const [registeredHandler] = (app.use as jest.Mock).mock.calls[0];
    const req = {};
    const res = {};
    const next = jest.fn();
    registeredHandler(req, res, next);

    expect(middlewareInstance.use).toHaveBeenCalledWith(req, res, next);
  });
});
