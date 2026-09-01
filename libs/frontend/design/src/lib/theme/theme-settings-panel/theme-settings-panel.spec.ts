import { TestBed } from '@angular/core/testing';
import { ThemeService } from '../theme.service';
import { ThemeSettingsPanel } from './theme-settings-panel';

describe('ThemeSettingsPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('style');
  });

  it('renders and reflects the current theme mode', async () => {
    await TestBed.configureTestingModule({
      imports: [ThemeSettingsPanel],
    }).compileComponents();

    const fixture = TestBed.createComponent(ThemeSettingsPanel);
    fixture.detectChanges();

    const theme = TestBed.inject(ThemeService);
    expect(fixture.componentInstance).toBeTruthy();
    expect(theme.mode()).toBe('system');
  });

  it('a colour override from the panel reaches the service', async () => {
    await TestBed.configureTestingModule({
      imports: [ThemeSettingsPanel],
    }).compileComponents();

    const fixture = TestBed.createComponent(ThemeSettingsPanel);
    fixture.detectChanges();
    const theme = TestBed.inject(ThemeService);

    const input: HTMLInputElement | null =
      fixture.nativeElement.querySelector('input[type="color"]');
    expect(input).not.toBeNull();
    (input as HTMLInputElement).value = '#abcdef';
    (input as HTMLInputElement).dispatchEvent(new Event('input'));

    expect(theme.overrides().primary).toBe('#abcdef');
  });
});
