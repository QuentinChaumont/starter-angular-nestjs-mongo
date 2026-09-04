import { AppLogger } from './app-logger.service';
import { RequestContextService } from './request-context.service';

describe('AppLogger', () => {
  function createLogger() {
    const requestContext = new RequestContextService();
    const logger = new AppLogger(requestContext);
    const writeSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    return { logger, requestContext, writeSpy };
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function lastEntry(writeSpy: jest.SpyInstance) {
    const [payload] = writeSpy.mock.calls[writeSpy.mock.calls.length - 1] as [
      string,
    ];
    return JSON.parse(payload.trim());
  }

  it('emits a structured JSON log with level, message and context', () => {
    const { logger, writeSpy } = createLogger();

    logger.log('Unable to update user', 'UserService');

    expect(lastEntry(writeSpy)).toEqual({
      level: 'log',
      message: 'Unable to update user',
      context: 'UserService',
    });
  });

  it('includes the requestId when called within a request context', () => {
    const { logger, requestContext, writeSpy } = createLogger();

    requestContext.run({ requestId: 'req-1' }, () => {
      logger.error('Unable to update user', undefined, 'UserService');
    });

    expect(lastEntry(writeSpy)).toEqual({
      level: 'error',
      message: 'Unable to update user',
      context: 'UserService',
      requestId: 'req-1',
    });
  });

  it('omits the requestId outside of a request context', () => {
    const { logger, writeSpy } = createLogger();

    logger.warn('No request in flight');

    const entry = lastEntry(writeSpy);
    expect(entry.requestId).toBeUndefined();
  });

  it('includes the trace for error logs when provided', () => {
    const { logger, writeSpy } = createLogger();

    logger.error('Boom', 'at file.ts:1:1', 'UserService');

    expect(lastEntry(writeSpy)).toEqual({
      level: 'error',
      message: 'Boom',
      context: 'UserService',
      trace: 'at file.ts:1:1',
    });
  });

  it('falls back to the context set via setContext()', () => {
    const { logger, writeSpy } = createLogger();
    logger.setContext('Bootstrap');

    logger.debug('starting up');

    expect(lastEntry(writeSpy)).toEqual({
      level: 'debug',
      message: 'starting up',
      context: 'Bootstrap',
    });
  });

  describe('LOG_LEVEL threshold', () => {
    function loggerAt(level: string) {
      const config = { logging: { level } } as unknown as ConstructorParameters<
        typeof AppLogger
      >[1];
      const logger = new AppLogger(new RequestContextService(), config);
      const writeSpy = jest
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);
      return { logger, writeSpy };
    }

    it('drops messages below the configured level', () => {
      const { logger, writeSpy } = loggerAt('warn');

      logger.debug('noisy');
      logger.log('routine');
      logger.warn('heads up');
      logger.error('broken');

      const levels = writeSpy.mock.calls.map(
        ([p]) => JSON.parse((p as string).trim()).level,
      );
      expect(levels).toEqual(['warn', 'error']);
    });

    it('emits everything when no config is wired (unchanged default)', () => {
      const { logger, writeSpy } = createLogger();
      logger.verbose('v');
      logger.debug('d');
      expect(writeSpy).toHaveBeenCalledTimes(2);
    });
  });
});
