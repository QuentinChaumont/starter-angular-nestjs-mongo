import {
  applyColorOverride,
  applyColorOverrides,
  applyMode,
  clearColorOverride,
  contrastColor,
} from './apply-theme';

function el(): HTMLElement {
  return document.createElement('div');
}

describe('apply-theme', () => {
  describe('applyMode', () => {
    it.each([
      ['light', 'light'],
      ['dark', 'dark'],
      ['system', 'light dark'],
    ] as const)('mode "%s" -> color-scheme "%s"', (mode, expected) => {
      const root = el();
      applyMode(root, mode);
      expect(root.style.getPropertyValue('color-scheme')).toBe(expected);
    });
  });

  describe('colour overrides', () => {
    it('sets the token var and a derived contrast on- var', () => {
      const root = el();
      applyColorOverride(root, 'primary', '#000000');

      expect(root.style.getPropertyValue('--app-color-primary')).toBe('#000000');
      expect(root.style.getPropertyValue('--app-color-on-primary')).toBe(
        '#ffffff',
      );
    });

    it('clears both vars', () => {
      const root = el();
      applyColorOverride(root, 'surface', '#ffffff');
      clearColorOverride(root, 'surface');

      expect(root.style.getPropertyValue('--app-color-surface')).toBe('');
      expect(root.style.getPropertyValue('--app-color-on-surface')).toBe('');
    });

    it('applyColorOverrides applies present tokens and clears absent ones', () => {
      const root = el();
      applyColorOverride(root, 'secondary', '#123456');

      applyColorOverrides(root, { primary: '#ffffff' });

      expect(root.style.getPropertyValue('--app-color-primary')).toBe('#ffffff');
      expect(root.style.getPropertyValue('--app-color-secondary')).toBe('');
    });
  });

  describe('contrastColor', () => {
    it('returns dark text on light backgrounds, light text on dark', () => {
      expect(contrastColor('#ffffff')).toBe('#1a1a1e');
      expect(contrastColor('#fff')).toBe('#1a1a1e');
      expect(contrastColor('#000000')).toBe('#ffffff');
      expect(contrastColor('#4f46e5')).toBe('#ffffff');
    });
  });
});
