export type ExportFit = 'cover' | 'contain';

export interface ExportViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeExportViewBox(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  fit: ExportFit = 'cover',
  anchorX = 0.5,
  anchorY = 0.5,
): ExportViewBox {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  let width = sourceWidth;
  let height = sourceHeight;
  if (
    (fit === 'cover' && targetRatio > sourceRatio) ||
    (fit === 'contain' && targetRatio < sourceRatio)
  )
    height = sourceWidth / targetRatio;
  else width = sourceHeight * targetRatio;
  return {
    x: (sourceWidth - width) * anchorX,
    y: (sourceHeight - height) * anchorY,
    width,
    height,
  };
}

export function physicalToPixels(
  value: number,
  unit: 'mm' | 'in',
  dpi: number,
) {
  return Math.max(
    1,
    Math.round(unit === 'mm' ? (value / 25.4) * dpi : value * dpi),
  );
}

export function printPixelSize(
  width: number,
  height: number,
  unit: 'mm' | 'in',
  dpi: number,
  bleedMm: number,
) {
  const bleedInUnit = unit === 'mm' ? bleedMm : bleedMm / 25.4;
  return {
    width: physicalToPixels(width + bleedInUnit * 2, unit, dpi),
    height: physicalToPixels(height + bleedInUnit * 2, unit, dpi),
  };
}
