import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OfflineBanner } from './offline-banner';

function setOnline(value: boolean): void {
  Object.defineProperty(window.navigator, 'onLine', {
    value,
    configurable: true,
  });
}

describe('OfflineBanner', () => {
  let fixture: ComponentFixture<OfflineBanner>;

  function build(): void {
    TestBed.configureTestingModule({ imports: [OfflineBanner] });
    fixture = TestBed.createComponent(OfflineBanner);
    fixture.detectChanges();
  }

  const banner = () =>
    fixture.nativeElement.querySelector('[data-testid="offline-banner"]');

  afterEach(() => {
    setOnline(true);
    fixture?.destroy();
  });

  it('is hidden while online and appears on the offline event', () => {
    build();
    expect(banner()).toBeNull();

    setOnline(false);
    window.dispatchEvent(new Event('offline'));
    fixture.detectChanges();

    expect(banner()).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain("You're offline");
  });

  it('starts visible when the browser is already offline, and clears on reconnect', () => {
    setOnline(false);
    build();
    expect(banner()).not.toBeNull();

    setOnline(true);
    window.dispatchEvent(new Event('online'));
    fixture.detectChanges();
    expect(banner()).toBeNull();
  });

  it('removes its listeners on destroy', () => {
    const remove = jest.spyOn(window, 'removeEventListener');
    build();
    fixture.destroy();
    expect(remove).toHaveBeenCalledWith('offline', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('online', expect.any(Function));
    remove.mockRestore();
  });
});
