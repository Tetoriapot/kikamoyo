'use client';

function safeName(name: string) {
  return name.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-') || 'kikamoyo-pattern';
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function serializedSvg(elementId: string, width: number, height: number, transparent: boolean, background: string) {
  const source = window.document.getElementById(elementId);
  if (!(source instanceof SVGSVGElement)) throw new Error('書き出し用SVGが見つかりません。');
  const clone = source.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.removeAttribute('class');
  clone.removeAttribute('role');
  clone.removeAttribute('aria-label');
  const existingBackground = clone.querySelector('[data-export-background="true"]');
  if (transparent) existingBackground?.remove();
  else if (!existingBackground) {
    const rect = window.document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('data-export-background', 'true');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', background);
    clone.insertBefore(rect, clone.querySelector('g'));
  }
  return new XMLSerializer().serializeToString(clone);
}

export function downloadSvg(options: { elementId: string; width: number; height: number; transparent: boolean; background: string; name: string }) {
  const source = serializedSvg(options.elementId, options.width, options.height, options.transparent, options.background);
  triggerDownload(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }), `${safeName(options.name)}.svg`);
}

export async function downloadRaster(options: {
  elementId: string;
  width: number;
  height: number;
  scale: number;
  transparent: boolean;
  background: string;
  name: string;
  format: 'png' | 'jpg' | 'webp';
}) {
  const pixelWidth = options.width * options.scale;
  const pixelHeight = options.height * options.scale;
  if (pixelWidth * pixelHeight > 64_000_000 || pixelWidth > 16384 || pixelHeight > 16384) {
    throw new Error('このサイズと倍率の組み合わせは大きすぎます。倍率かサイズを下げてください。');
  }
  const source = serializedSvg(options.elementId, pixelWidth, pixelHeight, options.transparent, options.background);
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('SVGの画像変換に失敗しました。'));
      image.src = url;
    });
    const canvas = window.document.createElement('canvas');
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvasを初期化できませんでした。');
    if (!options.transparent && options.format !== 'png') {
      context.fillStyle = options.background;
      context.fillRect(0, 0, pixelWidth, pixelHeight);
    }
    context.drawImage(image, 0, 0, pixelWidth, pixelHeight);
    const mime = options.format === 'jpg' ? 'image/jpeg' : options.format === 'webp' ? 'image/webp' : 'image/png';
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('画像データの作成に失敗しました。')), mime, 0.94));
    triggerDownload(blob, `${safeName(options.name)}.${options.format}`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function encodeShareState(value: unknown) {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return window.btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}
