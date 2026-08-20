import {
  Controller,
  Get,
  INestApplication,
  Injectable,
  Module,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { listenOnRandomPort } from '../../testing/listen-on-random-port';
import { LoggerModule } from './logger.module';
import { RequestContextService } from './request-context.service';
import { REQUEST_ID_HEADER } from './request-id.util';
import { useRequestIdMiddleware } from './use-request-id-middleware';

@Injectable()
class ProbeService {
  constructor(private readonly requestContext: RequestContextService) {}

  getRequestId(): string | undefined {
    return this.requestContext.requestId;
  }
}

@Controller('probe')
class ProbeController {
  constructor(
    private readonly probeService: ProbeService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Get()
  probe() {
    return {
      controllerRequestId: this.requestContext.requestId,
      serviceRequestId: this.probeService.getRequestId(),
    };
  }
}

@Module({
  imports: [LoggerModule],
  controllers: [ProbeController],
  providers: [ProbeService],
})
class ProbeModule {}

/**
 * Exercises the middleware, RequestContextService and controller/service
 * chain together over a real HTTP request, proving the requestId set by
 * the middleware is the exact same value seen by both the controller and
 * the service it calls.
 */
describe('LoggerModule (integration)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await NestFactory.create(ProbeModule, { logger: false });
    useRequestIdMiddleware(app);
    baseUrl = await listenOnRandomPort(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('propagates the incoming requestId to the controller, the service and the response header', async () => {
    const response = await fetch(`${baseUrl}/probe`, {
      headers: { [REQUEST_ID_HEADER]: 'integration-test-id' },
    });

    expect(response.headers.get(REQUEST_ID_HEADER)).toBe(
      'integration-test-id',
    );

    const body = await response.json();
    expect(body.controllerRequestId).toBe('integration-test-id');
    expect(body.serviceRequestId).toBe('integration-test-id');
  });

  it('generates a distinct requestId per request when none is provided', async () => {
    const [first, second] = await Promise.all([
      fetch(`${baseUrl}/probe`).then((response) => response.json()),
      fetch(`${baseUrl}/probe`).then((response) => response.json()),
    ]);

    expect(first.controllerRequestId).toBeDefined();
    expect(second.controllerRequestId).toBeDefined();
    expect(first.controllerRequestId).not.toBe(second.controllerRequestId);
  });
});
