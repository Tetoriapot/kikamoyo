export interface BrandPalette {
  id: string;
  name: string;
  background: string;
  colors: string[];
}
export const BRAND_PALETTE_KEY = 'kikamoyo.brand-palettes.v1';
export const MAX_BRAND_PALETTES = 20;
export function isBrandPalette(value: unknown): value is BrandPalette {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<BrandPalette>;
  const hex = /^#[0-9a-f]{6}$/i;
  return (
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    typeof item.name === 'string' &&
    item.name.trim().length > 0 &&
    item.name.length <= 80 &&
    typeof item.background === 'string' &&
    hex.test(item.background) &&
    Array.isArray(item.colors) &&
    item.colors.length >= 1 &&
    item.colors.length <= 8 &&
    item.colors.every((color) => typeof color === 'string' && hex.test(color))
  );
}
