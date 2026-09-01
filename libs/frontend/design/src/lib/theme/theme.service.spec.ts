import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

const root = document.documentElement;

function getService(): ThemeService {
  return TestBed.inject(ThemeService);
}

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    root.removeAttribute('style');
  });

  afterEach(() => {
    root.removeAttribute('style');
    jest.restoreAllMocks();
  });

  it('defaults to system mode and applies it to <html>', () => {
    const service = getService();

    expect(service.mode()).toBe('system');
    expect(root.style.getPropertyValue('color-scheme')).toBe('light dark');
  });

  it('restores a persisted mode and colour overrides on construction', () => {
    localStorage.setItem('app.theme.mode', 'dark');
    localStorage.setItem(
      'app.theme.overrides',
      JSON.stringify({ primary: '#123456', bogus: '#000' }),
    );

    const service = getService();

    expect(service.mode()).toBe('dark');
    expect(service.overrides()).toEqual({ primary: '#123456' });
    expect(root.style.getPropertyValue('color-scheme')).toBe('dark');
    expect(root.style.getPropertyValue('--app-color-primary')).toBe('#123456');
  });

  it('setMode updates the signal, the DOM and localStorage', () => {
    const service = getService();

    service.setMode('light');

    expect(service.mode()).toBe('light');
    expect(root.style.getPropertyValue('color-scheme')).toBe('light');
    expect(localStorage.getItem('app.theme.mode')).toBe('light');
  });

  it('setColor applies the override + a contrast on- colour and persists it', () => {
    const service = getService();

    service.setColor('primary', '#FFFFFF');

    expect(service.overrides()).toEqual({ primary: '#ffffff' });
    expect(root.style.getPropertyValue('--app-color-primary')).toBe('#ffffff');
    expect(root.style.getPropertyValue('--app-color-on-primary')).toBe(
      '#1a1a1e',
    );
    expect(JSON.parse(localStorage.getItem('app.theme.overrides') as string)).toEqual(
      { primary: '#ffffff' },
    );
  });

  it('setColor ignores an invalid hex', () => {
    const service = getService();

    service.setColor('primary', 'not-a-color');

    expect(service.overrides()).toEqual({});
  });

  it('resetColor removes one override, resetAll clears everything', () => {
    const service = getService();
    service.setColor('primary', '#111111');
    service.setColor('secondary', '#222222');

    service.resetColor('primary');
    expect(service.overrides()).toEqual({ secondary: '#222222' });
    expect(root.style.getPropertyValue('--app-color-primary')).toBe('');

    service.resetAll();
    expect(service.overrides()).toEqual({});
    expect(service.mode()).toBe('system');
  });

  it('falls back silently when localStorage throws', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    const service = getService();

    expect(service.mode()).toBe('system');
    expect(() => service.setColor('primary', '#000000')).not.toThrow();
    expect(service.overrides()).toEqual({ primary: '#000000' });
  });
});
