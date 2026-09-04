import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GlobalErrorHandler } from './global-error-handler';
import { NotificationService } from './notification/notification.service';

describe('GlobalErrorHandler', () => {
  const error = jest.fn();
  const reload = jest.fn();
  let consoleError: jest.SpyInstance;

  function make(): GlobalErrorHandler {
    TestBed.configureTestingModule({
      providers: [
        { provide: ErrorHandler, useClass: GlobalErrorHandler },
        { provide: NotificationService, useValue: { error } },
        {
          provide: DOCUMENT,
          useValue: { defaultView: { location: { reload } } },
        },
      ],
    });
    return TestBed.inject(ErrorHandler) as GlobalErrorHandler;
  }

  beforeEach(() => {
    error.mockReset();
    reload.mockReset();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => consoleError.mockRestore());

  it('logs and shows a toast with a working Reload action', () => {
    const handler = make();
    handler.handleError(new Error('boom'));

    expect(consoleError).toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);
    const opts = error.mock.calls[0][1];
    expect(opts.action).toBe('Reload');
    opts.onAction();
    expect(reload).toHaveBeenCalled();
  });

  it('leaves HTTP errors to the interceptor (logs only, no toast)', () => {
    const handler = make();
    handler.handleError(
      new HttpErrorResponse({ status: 500, url: '/api/x' }),
    );

    expect(consoleError).toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('does not stack toasts during an error loop', () => {
    const handler = make();
    handler.handleError(new Error('1'));
    handler.handleError(new Error('2'));
    handler.handleError(new Error('3'));

    expect(error).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledTimes(3);
  });
});
