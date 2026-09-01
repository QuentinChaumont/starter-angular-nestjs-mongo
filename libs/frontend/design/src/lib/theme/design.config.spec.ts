import { designConfig } from './design.config';
import { DesignColors } from './theme.types';

const COLOR_KEYS: (keyof DesignColors)[] = [
  'primary',
  'onPrimary',
  'secondary',
  'onSecondary',
  'error',
  'onError',
  'background',
  'surface',
  'onSurface',
  'surfaceVariant',
  'outline',
];

const HEX = /^#[0-9a-fA-F]{3,8}$/;

describe('designConfig', () => {
  it('defines every colour key for both light and dark, as hex', () => {
    for (const key of COLOR_KEYS) {
      expect(designConfig.colors[key]).toMatch(HEX);
      expect(designConfig.darkColors[key]).toMatch(HEX);
    }
  });

  it('has a full radius scale and a plausible density', () => {
    expect(Object.keys(designConfig.radius)).toEqual([
      'sm',
      'md',
      'lg',
      'pill',
    ]);
    expect(designConfig.density).toBeLessThanOrEqual(0);
    expect(designConfig.density).toBeGreaterThanOrEqual(-5);
  });

  it('names a font family', () => {
    expect(designConfig.typography.fontFamily.length).toBeGreaterThan(0);
  });
});
