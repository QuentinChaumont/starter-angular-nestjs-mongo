import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  const action$ = new Subject<void>();
  const open = jest.fn().mockReturnValue({ onAction: () => action$ });
  let service: NotificationService;

  beforeEach(() => {
    open.mockClear();
    TestBed.configureTestingModule({
      providers: [{ provide: MatSnackBar, useValue: { open } }],
    });
    service = TestBed.inject(NotificationService);
  });

  it('shows a success toast with the default duration and no action', () => {
    service.success('Saved');
    expect(open).toHaveBeenCalledWith(
      'Saved',
      undefined,
      expect.objectContaining({ duration: 4000, panelClass: 'notification--success' }),
    );
  });

  it('shows an error toast with the longer duration and a Dismiss action', () => {
    service.error('Boom');
    expect(open).toHaveBeenCalledWith(
      'Boom',
      'Dismiss',
      expect.objectContaining({ duration: 10000, panelClass: 'notification--error' }),
    );
  });

  it('wires a custom action + callback', () => {
    const onAction = jest.fn();
    service.error('Failed', { action: 'Copy ID', onAction });

    expect(open).toHaveBeenCalledWith('Failed', 'Copy ID', expect.anything());
    action$.next();
    expect(onAction).toHaveBeenCalled();
  });

  it('honours a duration override', () => {
    service.info('Hold', { duration: 0 });
    expect(open).toHaveBeenCalledWith(
      'Hold',
      undefined,
      expect.objectContaining({ duration: 0 }),
    );
  });
});
