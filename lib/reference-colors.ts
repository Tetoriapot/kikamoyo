/** Deterministic, alpha-aware quantization; operates only on a small local raster. */
export function extractPalette(pixels: Uint8ClampedArray, count = 6): string[] {
  const bins = new Map<string, { rgb: number[]; count: number }>();
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
    const key = rgb.map((value) => Math.floor(value / 24)).join(',');
    const bin = bins.get(key);
    if (bin) {
      bin.count++;
      rgb.forEach((value, channel) => {
        bin.rgb[channel] += value;
      });
    } else bins.set(key, { rgb, count: 1 });
  }
  const ranked = [...bins.values()]
    .sort((a, b) => b.count - a.count)
    .map((bin) => ({
      count: bin.count,
      rgb: bin.rgb.map((value) => Math.round(value / bin.count)),
    }));
  const selected: number[][] = [];
  for (const bin of ranked) {
    if (
      selected.every(
        (rgb) =>
          rgb.reduce(
            (distance, value, channel) =>
              distance + (value - bin.rgb[channel]) ** 2,
            0,
          ) >
          48 ** 2,
      )
    )
      selected.push(bin.rgb);
    if (selected.length >= Math.max(2, Math.min(8, count))) break;
  }
  return selected.map(
    (rgb) =>
      `#${rgb.map((value) => value.toString(16).padStart(2, '0')).join('')}`,
  );
}

export async function readReferenceColors(file: File) {
  if (
    !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
    file.size > 10 * 1024 * 1024
  )
    throw new Error(
      'PNG・JPEG・WebP、10MB以下を選んでください。 / Choose a PNG, JPEG or WebP under 10 MB.',
    );
  const bitmap = await createImageBitmap(file, {
    resizeWidth: 128,
    resizeHeight: 128,
    resizeQuality: 'high',
  });
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Cannot initialize image decoder');
    context.drawImage(bitmap, 0, 0, 128, 128);
    const colors = extractPalette(context.getImageData(0, 0, 128, 128).data);
    if (colors.length < 2)
      throw new Error(
        '異なる色を2色以上含む画像を選んでください。 / Choose an image with at least two distinct colors.',
      );
    return colors;
  } finally {
    bitmap.close();
  }
}
