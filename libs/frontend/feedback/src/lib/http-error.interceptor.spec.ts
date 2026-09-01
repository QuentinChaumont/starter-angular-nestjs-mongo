import {
  HttpClient,
  HttpContext,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification/notification.service';
import { SKIP_ERROR_TOAST, httpErrorInterceptor } from './http-error.interceptor';

describe('httpErrorInterceptor', () => {
  const error = jest.fn();
  let http: HttpClient;
  let mock: HttpTestingController;

  beforeEach(() => {
    error.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: { error } },
      ],
    });
    http = TestBed.inject(HttpClient);
    mock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => mock.verify());

  function flush(status: number, body: unknown, url = '/api/x') {
    http.get(url).subscribe({ error: () => undefined });
    mock
      .expectOne(url)
      .flush(body as string | object | null, { status, statusText: 'x' });
  }

  it('toasts the message + a Copy ID action for an ApiError body', () => {
    flush(409, {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Email already used',
      requestId: 'req-9',
    });
    expect(error).toHaveBeenCalledWith(
      'Email already used',
      expect.objectContaining({ action: 'Copy ID' }),
    );
  });

  it('toasts a generic message for a 5xx without a structured body', () => {
    flush(500, 'boom');
    expect(error).toHaveBeenCalledWith('Something went wrong. Please try again.');
  });

  it('toasts a network message for status 0', () => {
    flush(0, null);
    expect(error).toHaveBeenCalledWith(
      'Network error — check your connection and retry.',
    );
  });

  it('never toasts a 401 (auth flow handles it)', () => {
    flush(401, { statusCode: 401, code: 'UNAUTHENTICATED', message: 'nope' });
    expect(error).not.toHaveBeenCalled();
  });

  it('honours SKIP_ERROR_TOAST', () => {
    http
      .get('/api/x', {
        context: new HttpContext().set(SKIP_ERROR_TOAST, true),
      })
      .subscribe({ error: () => undefined });
    mock
      .expectOne('/api/x')
      .flush({ statusCode: 500, code: 'X', message: 'y' }, { status: 500, statusText: 'x' });

    expect(error).not.toHaveBeenCalled();
  });
});
