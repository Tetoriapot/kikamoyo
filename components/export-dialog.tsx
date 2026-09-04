'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileArchive,
  FileImage,
  Gauge,
  Loader2,
  Printer,
  ScanLine,
} from 'lucide-react';
import { zipSync } from 'fflate';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PALETTE_OPTIONS } from '@/data/presets';
import {
  computeExportViewBox,
  printPixelSize,
  type ExportFit,
} from '@/lib/export-plan';
import {
  createCssText,
  createRasterBlob,
  createSvgBlob,
  downloadLoopWebm,
  downloadRaster,
  downloadSvg,
  downloadText,
  inspectSvgSeams,
  safeName,
  serializedSvg,
  triggerDownload,
} from '@/lib/export-pattern';
import type { Locale } from '@/lib/i18n';
import { describePattern } from '@/lib/pattern-summary';
import { PatternCanvas } from '@/lib/pattern-engine';
import { getRepeatPlan } from '@/lib/repeat-layout';
import {
  CANVAS_SIZES,
  cloneDocument,
  type EditorDocument,
} from '@/lib/pattern-types';

type Format = 'png' | 'svg' | 'jpg' | 'webp' | 'css' | 'json' | 'webm';

function gamutRisk(document: EditorDocument) {
  return document.layers.some(
    (layer) =>
      layer.opacity < 1 ||
      layer.blendMode !== 'normal' ||
      layer.config.jitterOpacity > 0,
  )
    ? '半透明または描画モードは印刷時に色が変わる場合があります。実機校正を推奨します。'
    : '色はsRGBです。CMYK変換後の色は印刷所で確認してください。';
}

export function ExportDialog({
  document,
  name,
  locale = 'ja',
}: {
  document: EditorDocument;
  name: string;
  locale?: Locale;
}) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<Format>('png');
  const [width, setWidth] = useState(document.canvas.width);
  const [height, setHeight] = useState(document.canvas.height);
  const [widthDraft, setWidthDraft] = useState(String(document.canvas.width));
  const [heightDraft, setHeightDraft] = useState(
    String(document.canvas.height),
  );
  const [scale, setScale] = useState(1);
  const [transparent, setTransparent] = useState(document.canvas.transparent);
  const [fit, setFit] = useState<ExportFit>('cover');
  const [tileOnly, setTileOnly] = useState(false);
  const [optimize, setOptimize] = useState(true);
  const [batch, setBatch] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const [printWidth, setPrintWidth] = useState(210);
  const [printHeight, setPrintHeight] = useState(297);
  const [dpi, setDpi] = useState(300);
  const [bleed, setBleed] = useState(3);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const en = locale === 'en';
  const effectiveTransparent =
    format === 'jpg' || format === 'webm' ? false : transparent;
  const repeatPlan = getRepeatPlan(
    document.canvas.repeatMode ?? 'straight',
    document.canvas.tileSize,
  );
  const sourceWidth =
    tileOnly && document.canvas.seamless
      ? repeatPlan.width
      : document.canvas.width;
  const sourceHeight =
    tileOnly && document.canvas.seamless
      ? repeatPlan.height
      : document.canvas.height;
  const viewBox =
    tileOnly && document.canvas.seamless
      ? { x: 0, y: 0, width: sourceWidth, height: sourceHeight }
      : computeExportViewBox(sourceWidth, sourceHeight, width, height, fit);
  const summary = useMemo(
    () => describePattern(document, locale),
    [document, locale],
  );
  const batchSizes = useMemo(
    () => [
      {
        label: 'original',
        width: document.canvas.width,
        height: document.canvas.height,
      },
      { label: 'square', width: 1080, height: 1080 },
      { label: 'ogp', width: 1200, height: 630 },
    ],
    [document.canvas.height, document.canvas.width],
  );
  const batchPalettes = useMemo(
    () => [
      {
        label: 'original',
        background: document.canvas.background,
        colors: document.palette,
      },
      ...['pastel', 'night']
        .map((id) => PALETTE_OPTIONS.find((item) => item.id === id))
        .filter(Boolean)
        .map((item) => ({
          label: item!.id,
          background: item!.colors[0],
          colors: item!.colors.slice(1),
        })),
    ],
    [document.canvas.background, document.palette],
  );
  const batchJobs = useMemo(
    () =>
      batchSizes.flatMap((size) =>
        batchPalettes.map((palette, paletteIndex) => {
          const base = cloneDocument(document);
          const variant: EditorDocument = {
            ...base,
            palette: [...palette.colors],
            canvas: {
              ...base.canvas,
              background: palette.background,
              transparent: effectiveTransparent,
            },
          };
          return {
            id: `export-batch-${size.label}-${paletteIndex}`,
            size,
            palette,
            document: variant,
            viewBox: computeExportViewBox(
              document.canvas.width,
              document.canvas.height,
              size.width,
              size.height,
              fit,
            ),
          };
        }),
      ),
    [batchPalettes, batchSizes, document, effectiveTransparent, fit],
  );

  function setDimensions(nextWidth: number, nextHeight: number) {
    setWidth(nextWidth);
    setHeight(nextHeight);
    setWidthDraft(String(nextWidth));
    setHeightDraft(String(nextHeight));
  }
  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDimensions(document.canvas.width, document.canvas.height);
      setTransparent(document.canvas.transparent);
      setTileOnly(false);
      setMessage('');
    }
    setOpen(nextOpen);
  }
  function commitDimension(dimension: 'width' | 'height') {
    const draft = dimension === 'width' ? widthDraft : heightDraft;
    const current = dimension === 'width' ? width : height;
    const parsed = Number(draft);
    const next =
      draft.trim() && Number.isFinite(parsed)
        ? Math.min(16384, Math.max(64, Math.round(parsed)))
        : current;
    if (dimension === 'width') {
      setWidth(next);
      setWidthDraft(String(next));
    } else {
      setHeight(next);
      setHeightDraft(String(next));
    }
  }
  function chooseSize(value: string | null) {
    const selected = value ? CANVAS_SIZES[Number(value)] : undefined;
    if (selected) setDimensions(selected[1], selected[2]);
  }
  function toggleTile(value: boolean) {
    setTileOnly(value);
    if (value) setDimensions(repeatPlan.width, repeatPlan.height);
    else setDimensions(document.canvas.width, document.canvas.height);
  }
  function applyPrint() {
    const pixels = printPixelSize(printWidth, printHeight, 'mm', dpi, bleed);
    setDimensions(pixels.width, pixels.height);
    setMessage(
      en
        ? `${bleed} mm bleed included; pixel dimensions are equivalent to ${dpi} dpi.`
        : `塗り足し${bleed}mm込み・${dpi}dpi相当のピクセル数です。`,
    );
  }

  async function downloadBatch() {
    if (!['png', 'svg', 'jpg', 'webp'].includes(format))
      throw new Error(
        en
          ? 'Batch export supports image formats.'
          : '一括書き出しは画像形式を選んでください。',
      );
    const files: Record<string, Uint8Array> = {};
    for (const job of batchJobs) {
      const filename = `${safeName(name)}-${job.size.label}-${job.palette.label}.${format}`;
      const blob =
        format === 'svg'
          ? createSvgBlob({
              elementId: job.id,
              width: job.size.width,
              height: job.size.height,
              transparent: effectiveTransparent,
              background: job.document.canvas.background,
              optimize,
            })
          : await createRasterBlob({
              elementId: job.id,
              width: job.size.width,
              height: job.size.height,
              scale,
              transparent: effectiveTransparent,
              background: job.document.canvas.background,
              format: format as 'png' | 'jpg' | 'webp',
            });
      files[filename] = new Uint8Array(await blob.arrayBuffer());
    }
    triggerDownload(
      new Blob([zipSync(files, { level: 6 }) as BlobPart], {
        type: 'application/zip',
      }),
      `${safeName(name)}-batch.zip`,
    );
  }

  async function download() {
    setBusy(true);
    setMessage('');
    try {
      if (batch) await downloadBatch();
      else if (format === 'svg')
        downloadSvg({
          elementId: 'export-pattern-canvas',
          width,
          height,
          transparent: effectiveTransparent,
          background: document.canvas.background,
          name,
          optimize,
        });
      else if (format === 'css') {
        const svg = serializedSvg(
          'export-pattern-canvas',
          width,
          height,
          effectiveTransparent,
          document.canvas.background,
          true,
        );
        downloadText(
          createCssText(svg, width, height),
          `${safeName(name)}.css`,
          'text/css;charset=utf-8',
        );
      } else if (format === 'json')
        downloadText(
          JSON.stringify(
            { format: 'kikamoyo', version: 1, name, document },
            null,
            2,
          ),
          `${safeName(name)}.json`,
          'application/json;charset=utf-8',
        );
      else if (format === 'webm') {
        if (!document.canvas.seamless)
          throw new Error(
            en
              ? 'Enable seamless mode before exporting a loop.'
              : 'ループ動画はシームレスを有効にしてから書き出してください。',
          );
        await downloadLoopWebm({
          elementId: 'export-loop-cell',
          width: repeatPlan.width,
          height: repeatPlan.height,
          background: document.canvas.background,
          name,
        });
      } else
        await downloadRaster({
          elementId: 'export-pattern-canvas',
          width,
          height,
          scale,
          transparent: effectiveTransparent,
          background: document.canvas.background,
          name,
          format: format as 'png' | 'jpg' | 'webp',
        });
      setMessage(en ? 'Download started.' : 'ダウンロードを開始しました。');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : en
            ? 'Export failed.'
            : '書き出しに失敗しました。',
      );
    } finally {
      setBusy(false);
    }
  }
  async function inspect() {
    setBusy(true);
    try {
      const result = await inspectSvgSeams(
        'export-loop-cell',
        document.canvas.background,
      );
      setMessage(
        result.ok
          ? en
            ? 'Pixel check: no obvious edge seam.'
            : 'ピクセル検査: 目立つ端の継ぎ目はありません。'
          : en
            ? 'Pixel check: check the tile edges before production.'
            : 'ピクセル検査: 本番前にタイル端を確認してください。',
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : '検査に失敗しました。',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {open && (
        <div className="export-source" aria-hidden="true">
          <PatternCanvas
            id="export-pattern-canvas"
            document={{
              ...document,
              canvas: { ...document.canvas, transparent: effectiveTransparent },
            }}
            viewport={tileOnly ? 'fundamentalTile' : 'canvas'}
            outputWidth={width}
            outputHeight={height}
            viewBox={viewBox}
            maxObjects={5000}
            description={summary}
          />
          {document.canvas.seamless && (
            <PatternCanvas
              id="export-loop-cell"
              document={{
                ...document,
                canvas: {
                  ...document.canvas,
                  transparent: effectiveTransparent,
                },
              }}
              viewport="fundamentalTile"
              outputWidth={repeatPlan.width}
              outputHeight={repeatPlan.height}
              maxObjects={5000}
            />
          )}
          {batch &&
            batchJobs.map((job) => (
              <PatternCanvas
                key={job.id}
                id={job.id}
                document={job.document}
                outputWidth={job.size.width}
                outputHeight={job.size.height}
                viewBox={job.viewBox}
                maxObjects={5000}
              />
            ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger render={<Button className="ml-1 px-3" />}>
          <Download data-icon="inline-start" />
          {en ? 'Export' : '書き出し'}
        </DialogTrigger>
        <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-[min(720px,calc(100vw-1rem))] overflow-y-auto overscroll-contain p-0">
          <DialogHeader className="sticky top-0 z-10 border-b bg-background px-4 py-4 pr-12 sm:px-5">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileImage className="size-5 text-primary" />
              {en ? 'Export artwork' : '作品を書き出す'}
            </DialogTitle>
            <DialogDescription>
              {en
                ? 'Images, tile cells, batch ZIP, print sizes, CSS, JSON, or a loop.'
                : '画像・タイル・一括ZIP・印刷・CSS・JSON・ループ動画に対応します。'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 px-4 py-4 sm:px-5">
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold text-muted-foreground">
                {en ? 'Format' : '形式'}
              </legend>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                {(
                  ['png', 'svg', 'jpg', 'webp', 'css', 'json', 'webm'] as const
                ).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={format === value}
                    onClick={() => {
                      setFormat(value);
                      if (['css', 'json', 'webm'].includes(value))
                        setBatch(false);
                      if (
                        (value === 'css' || value === 'webm') &&
                        document.canvas.seamless
                      )
                        toggleTile(true);
                    }}
                    className={`min-h-10 rounded-lg border px-1 text-xs font-bold uppercase ${format === value ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <span className="text-xs font-semibold text-muted-foreground">
                  {en ? 'Output size' : '出力サイズ'}
                </span>
                <Select onValueChange={chooseSize}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={`${width} × ${height}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {CANVAS_SIZES.map((size, index) => (
                      <SelectItem key={size[0]} value={String(index)}>
                        {size[0]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <Input
                    aria-label={en ? 'Width' : '出力幅'}
                    type="number"
                    min={64}
                    max={16384}
                    value={widthDraft}
                    onChange={(event) => setWidthDraft(event.target.value)}
                    onBlur={() => commitDimension('width')}
                  />
                  <span>×</span>
                  <Input
                    aria-label={en ? 'Height' : '出力高さ'}
                    type="number"
                    min={64}
                    max={16384}
                    value={heightDraft}
                    onChange={(event) => setHeightDraft(event.target.value)}
                    onBlur={() => commitDimension('height')}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <span className="text-xs font-semibold text-muted-foreground">
                  {en ? 'Composition' : '構図'}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={fit === 'cover' ? 'secondary' : 'outline'}
                    onClick={() => setFit('cover')}
                  >
                    {en ? 'Fill / crop' : '全面・切抜き'}
                  </Button>
                  <Button
                    variant={fit === 'contain' ? 'secondary' : 'outline'}
                    onClick={() => setFit('contain')}
                  >
                    {en ? 'Fit inside' : '全体を収める'}
                  </Button>
                </div>
                <p className="ui-help text-muted-foreground">
                  {en
                    ? 'Changing size keeps the generated coordinates fixed.'
                    : 'サイズを変えても生成座標を固定し、同じ構図を保ちます。'}
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border p-3 text-sm">
                <span>{en ? 'Fundamental tile only' : '基本タイルだけ'}</span>
                <Switch
                  aria-label={en ? 'Fundamental tile only' : '基本タイルだけ'}
                  checked={tileOnly}
                  disabled={!document.canvas.seamless}
                  onCheckedChange={toggleTile}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3 text-sm">
                <span>{en ? 'Optimize SVG' : 'SVGを最適化'}</span>
                <Switch
                  aria-label={en ? 'Optimize SVG' : 'SVGを最適化'}
                  checked={optimize}
                  onCheckedChange={setOptimize}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3 text-sm">
                <span>{en ? 'Transparent background' : '背景を透明'}</span>
                <Switch
                  aria-label={en ? 'Transparent background' : '背景を透明'}
                  checked={effectiveTransparent}
                  disabled={format === 'jpg' || format === 'webm'}
                  onCheckedChange={setTransparent}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3 text-sm">
                <span>
                  {en ? 'Batch: 3 sizes × 3 colors' : '一括: 3サイズ × 3配色'}
                </span>
                <Switch
                  aria-label={en ? 'Batch export' : '一括書き出し'}
                  checked={batch}
                  disabled={!['png', 'svg', 'jpg', 'webp'].includes(format)}
                  onCheckedChange={setBatch}
                />
              </div>
            </div>
            {!['svg', 'css', 'json', 'webm'].includes(format) && (
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-muted-foreground">
                  {en ? 'Scale' : '倍率'}
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 4].map((value) => (
                    <Button
                      key={value}
                      variant={scale === value ? 'secondary' : 'outline'}
                      onClick={() => setScale(value)}
                    >
                      {value}x
                    </Button>
                  ))}
                </div>
              </fieldset>
            )}
            <details
              open={printMode}
              onToggle={(event) => setPrintMode(event.currentTarget.open)}
              className="rounded-xl border p-3"
            >
              <summary className="cursor-pointer font-semibold">
                <Printer className="mr-2 inline size-4" />
                {en ? 'Print setup' : '印刷設定'}
              </summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div className="text-xs">
                  {en ? 'Width (mm)' : '幅 (mm)'}
                  <Input
                    aria-label={
                      en ? 'Print width in millimeters' : '印刷幅ミリメートル'
                    }
                    type="number"
                    min={10}
                    max={2000}
                    value={printWidth}
                    onChange={(event) =>
                      setPrintWidth(Number(event.target.value))
                    }
                  />
                </div>
                <div className="text-xs">
                  {en ? 'Height (mm)' : '高さ (mm)'}
                  <Input
                    aria-label={
                      en
                        ? 'Print height in millimeters'
                        : '印刷高さミリメートル'
                    }
                    type="number"
                    min={10}
                    max={2000}
                    value={printHeight}
                    onChange={(event) =>
                      setPrintHeight(Number(event.target.value))
                    }
                  />
                </div>
                <div className="text-xs">
                  DPI
                  <Select
                    value={String(dpi)}
                    onValueChange={(value) => value && setDpi(Number(value))}
                  >
                    <SelectTrigger className="w-full" aria-label="DPI">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[72, 150, 300, 600].map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs">
                  {en ? 'Bleed (mm)' : '塗り足し (mm)'}
                  <Input
                    aria-label={
                      en ? 'Bleed in millimeters' : '塗り足しミリメートル'
                    }
                    type="number"
                    min={0}
                    max={20}
                    value={bleed}
                    onChange={(event) => setBleed(Number(event.target.value))}
                  />
                </div>
                <Button
                  className="sm:col-span-4"
                  variant="outline"
                  onClick={applyPrint}
                >
                  <Gauge />
                  {en ? 'Apply print pixels' : '印刷ピクセルへ反映'}
                </Button>
                <p className="ui-help sm:col-span-4 text-amber-700 dark:text-amber-300">
                  {en
                    ? gamutRisk(document)
                        .replace(
                          '半透明または描画モードは印刷時に色が変わる場合があります。実機校正を推奨します。',
                          'Transparency and blend modes may shift in print. Request a proof.',
                        )
                        .replace(
                          '色はsRGBです。CMYK変換後の色は印刷所で確認してください。',
                          'Colors are sRGB. Verify the CMYK conversion with your printer.',
                        )
                    : gamutRisk(document)}
                </p>
              </div>
            </details>
            {document.canvas.seamless && (
              <Button variant="outline" onClick={inspect} disabled={busy}>
                <ScanLine />
                {en ? 'Run pixel seam check' : 'ピクセル継ぎ目検査'}
              </Button>
            )}
            <div className="rounded-lg bg-muted/55 px-3 py-2 text-xs text-muted-foreground">
              {batch
                ? en
                  ? 'ZIP: 9 composition-preserving files'
                  : 'ZIP: 構図を保った9ファイル'
                : `${width * (['svg', 'css', 'json'].includes(format) ? 1 : scale)} × ${height * (['svg', 'css', 'json'].includes(format) ? 1 : scale)} px`}
            </div>
            <p
              className="min-h-5 text-xs text-muted-foreground"
              aria-live="polite"
            >
              {message && (
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5" />
                  {message}
                </span>
              )}
            </p>
          </div>
          <DialogFooter className="sticky bottom-0 border-t bg-background px-4 py-4 sm:px-5">
            <Button onClick={download} disabled={busy} className="min-w-40">
              {busy ? (
                <Loader2 className="animate-spin" />
              ) : batch ? (
                <FileArchive />
              ) : (
                <Download />
              )}
              {en ? 'Download' : 'ダウンロード'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
