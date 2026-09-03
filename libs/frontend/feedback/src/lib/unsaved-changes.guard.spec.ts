import { runInInjectionContext, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { of } from 'rxjs';
import { DialogService } from './dialog/dialog.service';
import { HasUnsavedChanges, unsavedChangesGuard } from './unsaved-changes.guard';

function run(
  component: HasUnsavedChanges | null,
  injector: Injector,
): boolean | ReturnType<typeof of> {
  return runInInjectionContext(injector, () =>
    unsavedChangesGuard(
      component as HasUnsavedChanges,
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
      {} as RouterStateSnapshot,
    ),
  ) as boolean | ReturnType<typeof of>;
}

describe('unsavedChangesGuard', () => {
  it('allows leaving when there are no unsaved changes', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: DialogService, useValue: { confirm: jest.fn() } }],
    });
    const result = run(
      { hasUnsavedChanges: () => false },
      TestBed.inject(Injector),
    );
    expect(result).toBe(true);
  });

  it('asks for confirmation when there are unsaved changes', (done) => {
    const confirm = jest.fn().mockReturnValue(of(false));
    TestBed.configureTestingModule({
      providers: [{ provide: DialogService, useValue: { confirm } }],
    });

    const result = run(
      { hasUnsavedChanges: () => true },
      TestBed.inject(Injector),
    );

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Leave without saving?' }),
    );
    (result as ReturnType<typeof of>).subscribe((value: unknown) => {
      expect(value).toBe(false);
      done();
    });
  });

  it('allows leaving when the component does not implement the interface', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: DialogService, useValue: { confirm: jest.fn() } }],
    });
    const result = run(null, TestBed.inject(Injector));
    expect(result).toBe(true);
  });
});
