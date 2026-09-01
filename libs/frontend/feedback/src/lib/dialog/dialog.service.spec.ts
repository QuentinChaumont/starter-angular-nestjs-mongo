import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { DialogService } from './dialog.service';

describe('DialogService', () => {
  const afterClosed = jest.fn();
  const open = jest.fn().mockImplementation(() => ({ afterClosed }));
  let service: DialogService;

  beforeEach(() => {
    open.mockClear();
    TestBed.configureTestingModule({
      providers: [{ provide: MatDialog, useValue: { open } }],
    });
    service = TestBed.inject(DialogService);
  });

  it('confirm() resolves true only when the dialog closes with true', () => {
    afterClosed.mockReturnValue(of(true));
    let result: boolean | undefined;
    service.confirm({ title: 'Delete?', message: '...' }).subscribe((r) => (result = r));
    expect(result).toBe(true);

    const [, config] = open.mock.calls[0];
    expect(config.data).toEqual({ title: 'Delete?', message: '...', mode: 'confirm' });
    expect(config.width).toBe('420px');
  });

  it('confirm() resolves false on cancel / Escape (undefined)', () => {
    afterClosed.mockReturnValue(of(undefined));
    let result: boolean | undefined;
    service.confirm({ title: 't', message: 'm' }).subscribe((r) => (result = r));
    expect(result).toBe(false);
  });

  it('alert() completes with void and passes mode: alert', () => {
    afterClosed.mockReturnValue(of(true));
    let done = false;
    service.alert({ title: 't', message: 'm' }).subscribe({ complete: () => (done = true) });
    expect(done).toBe(true);
    expect(open.mock.calls[0][1].data.mode).toBe('alert');
  });

  it('open() forwards the component and merges the shared defaults', () => {
    class Cmp {}
    service.open(Cmp, { data: { x: 1 }, width: '600px' });
    const [component, config] = open.mock.calls[0];
    expect(component).toBe(Cmp);
    expect(config).toEqual(
      expect.objectContaining({ width: '600px', autoFocus: 'dialog', data: { x: 1 } }),
    );
  });
});
