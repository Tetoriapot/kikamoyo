export interface SeamResult {
  horizontal: number;
  vertical: number;
  ok: boolean;
}

function distance(data: Uint8ClampedArray, a: number, b: number) {
  return Math.sqrt(
    (data[a] - data[b]) ** 2 +
      (data[a + 1] - data[b + 1]) ** 2 +
      (data[a + 2] - data[b + 2]) ** 2 +
      (data[a + 3] - data[b + 3]) ** 2,
  );
}

export function analyzeTileSeams(image: ImageData): SeamResult {
  const { data, width, height } = image;
  let vertical = 0;
  let horizontal = 0;
  for (let y = 0; y < height; y += 1)
    vertical += distance(data, y * width * 4, (y * width + width - 1) * 4);
  for (let x = 0; x < width; x += 1)
    horizontal += distance(data, x * 4, ((height - 1) * width + x) * 4);
  vertical /= height;
  horizontal /= width;
  return { horizontal, vertical, ok: Math.max(horizontal, vertical) <= 28 };
}
