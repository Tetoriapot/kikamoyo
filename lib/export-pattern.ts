'use client';

import { optimizeSvgText } from '@/lib/svg-optimize';
import { analyzeTileSeams, type SeamResult } from '@/lib/seam-analysis';

export function safeName(name: string) {
  return (
    name
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-') || 'kikamoyo-pattern'
  );
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function serializedSvg(
  elementId: string,
  width: number,
  height: number,
  transparent: boolean,
  background: string,
  optimize = true,
) {
  const source = window.document.getElementById(elementId);
  if (!(source instanceof SVGSVGElement))
    throw new Error('書き出し用SVGが見つかりません。');
  const clone = source.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.removeAttribute('class');
  clone.removeAttribute('role');
  clone
    .querySelectorAll('[data-export-ignore="true"]')
    .forEach((node) => node.remove());
  const existingBackground = clone.querySelector(
    '[data-export-background="true"]',
  );
  if (transparent) existingBackground?.remove();
  else if (!existingBackground) {
    const rect = window.document.createElementNS(
      'http://www.w3.org/2000/svg',
      'rect',
    );
    rect.setAttribute('data-export-background', 'true');
    const viewBox = clone.viewBox.baseVal;
    rect.setAttribute('x', String(viewBox.x));
    rect.setAttribute('y', String(viewBox.y));
    rect.setAttribute('width', String(viewBox.width));
    rect.setAttribute('height', String(viewBox.height));
    rect.setAttribute('fill', background);
    const firstVisual =
      [...clone.children].find(
        (child) =>
          !['title', 'desc', 'defs'].includes(child.tagName.toLowerCase()),
      ) ?? null;
    clone.insertBefore(rect, firstVisual);
  }
  const text = new XMLSerializer().serializeToString(clone);
  return optimize ? optimizeSvgText(text) : text;
}

export function createSvgBlob(options: {
  elementId: string;
  width: number;
  height: number;
  transparent: boolean;
  background: string;
  optimize?: boolean;
}) {
  return new Blob(
    [
      serializedSvg(
        options.elementId,
        options.width,
        options.height,
        options.transparent,
        options.background,
        options.optimize,
      ),
    ],
    { type: 'image/svg+xml;charset=utf-8' },
  );
}

export function downloadSvg(options: {
  elementId: string;
  width: number;
  height: number;
  transparent: boolean;
  background: string;
  name: string;
  optimize?: boolean;
}) {
  triggerDownload(createSvgBlob(options), `${safeName(options.name)}.svg`);
}

async function loadSvgImage(source: string) {
  const url = URL.createObjectURL(
    new Blob([source], { type: 'image/svg+xml;charset=utf-8' }),
  );
  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('SVGの画像変換に失敗しました。'));
      image.src = url;
    });
    return await createImageBitmap(image);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function createRasterBlob(options: {
  elementId: string;
  width: number;
  height: number;
  scale: number;
  transparent: boolean;
  background: string;
  format: 'png' | 'jpg' | 'webp';
}) {
  const effectiveTransparent =
    options.format === 'jpg' ? false : options.transparent;
  const pixelWidth = options.width * options.scale;
  const pixelHeight = options.height * options.scale;
  if (
    pixelWidth * pixelHeight > 64_000_000 ||
    pixelWidth > 16384 ||
    pixelHeight > 16384
  )
    throw new Error(
      'このサイズと倍率の組み合わせは大きすぎます。倍率かサイズを下げてください。',
    );
  const source = serializedSvg(
    options.elementId,
    pixelWidth,
    pixelHeight,
    effectiveTransparent,
    options.background,
  );
  const bitmap = await loadSvgImage(source);
  try {
    const canvas = window.document.createElement('canvas');
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvasを初期化できませんでした。');
    if (options.format === 'jpg' || !effectiveTransparent) {
      context.fillStyle = options.background;
      context.fillRect(0, 0, pixelWidth, pixelHeight);
    }
    context.drawImage(bitmap, 0, 0, pixelWidth, pixelHeight);
    const mime =
      options.format === 'jpg'
        ? 'image/jpeg'
        : options.format === 'webp'
          ? 'image/webp'
          : 'image/png';
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(new Error('画像データの作成に失敗しました。')),
        mime,
        0.94,
      ),
    );
  } finally {
    bitmap.close();
  }
}

export async function downloadRaster(
  options: Parameters<typeof createRasterBlob>[0] & { name: string },
) {
  const blob = await createRasterBlob(options);
  triggerDownload(blob, `${safeName(options.name)}.${options.format}`);
}

export async function inspectSvgSeams(
  elementId: string,
  background: string,
): Promise<SeamResult> {
  const size = 256;
  const source = serializedSvg(elementId, size, size, false, background);
  const bitmap = await loadSvgImage(source);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('継ぎ目検査を開始できませんでした。');
    context.fillStyle = background;
    context.fillRect(0, 0, size, size);
    context.drawImage(bitmap, 0, 0, size, size);
    return analyzeTileSeams(context.getImageData(0, 0, size, size));
  } finally {
    bitmap.close();
  }
}

export function createCssText(svg: string, width: number, height: number) {
  const encoded = encodeURIComponent(svg)
    .replaceAll("'", '%27')
    .replaceAll('"', '%22');
  return `.kikamoyo-pattern {\n  background-image: url("data:image/svg+xml,${encoded}");\n  background-repeat: repeat;\n  background-size: ${width}px ${height}px;\n}\n`;
}

export function downloadText(
  text: string,
  filename: string,
  mime = 'text/plain;charset=utf-8',
) {
  triggerDownload(new Blob([text], { type: mime }), filename);
}

export async function downloadLoopWebm(options: {
  elementId: string;
  width: number;
  height: number;
  background: string;
  name: string;
  duration?: number;
  fps?: number;
}) {
  if (typeof MediaRecorder === 'undefined')
    throw new Error('このブラウザーはWebM書き出しに対応していません。');
  const size = Math.min(768, Math.max(256, options.width));
  const outputHeight = Math.max(
    128,
    Math.round((size * options.height) / options.width),
  );
  const source = serializedSvg(
    options.elementId,
    size,
    outputHeight,
    false,
    options.background,
  );
  const bitmap = await loadSvgImage(source);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = outputHeight;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('動画用Canvasを初期化できませんでした。');
  }
  const fps = options.fps ?? 24;
  const duration = options.duration ?? 2;
  const stream = canvas.captureStream(fps);
  const mime = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ].find((value) => MediaRecorder.isTypeSupported(value));
  if (!mime) {
    bitmap.close();
    stream.getTracks().forEach((track) => track.stop());
    throw new Error('WebMコーデックを利用できません。');
  }
  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 4_000_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new Error('WebMの作成に失敗しました。'));
  });
  recorder.start();
  const frames = Math.round(duration * fps);
  for (let frame = 0; frame < frames; frame += 1) {
    const phase = frame / frames;
    const offsetX = -Math.round(size * phase);
    context.fillStyle = options.background;
    context.fillRect(0, 0, size, outputHeight);
    for (let x = offsetX - size; x < size; x += size)
      context.drawImage(bitmap, x, 0, size, outputHeight);
    await new Promise((resolve) => window.setTimeout(resolve, 1000 / fps));
  }
  recorder.stop();
  await stopped;
  bitmap.close();
  stream.getTracks().forEach((track) => track.stop());
  triggerDownload(
    new Blob(chunks, { type: mime }),
    `${safeName(options.name)}-loop.webm`,
  );
}

export function encodeShareState(value: unknown) {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return window
    .btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/g, '');
}
