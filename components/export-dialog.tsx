'use client';

import { useMemo, useState } from 'react';
import {
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
import { paletteLabel, type Locale } from '@/lib/i18n';
import {
  createLocalProject,
  encodeProjectFile,
  readBrandPalettes,
} from '@/lib/project-codec';
import type { BrandPalette } from '@/lib/brand-palettes';
import { describePattern } from '@/lib/pattern-summary';
import { PatternCanvas } from '@/lib/pattern-engine';
import { LoopPreview } from '@/components/loop-preview';
import { getRepeatPlan } from '@/lib/repeat-layout';
import {
  CANVAS_SIZES,
  cloneDocument,
  type EditorDocument,
  type EditorSnapshot,
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
  snapshot,
  recommendedFormat = 'png',
}: {
  document: EditorDocument;
  name: string;
  locale?: Locale;
  snapshot?: EditorSnapshot;
  recommendedFormat?: 'png' | 'svg' | 'jpg' | 'webp';
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
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['original']);
  const [selectedPalettes, setSelectedPalettes] = useState<string[]>([
    'original',
  ]);
  const [brandPalettes, setBrandPalettes] = useState<BrandPalette[]>([]);
  const [printMode, setPrintMode] = useState(false);
  const [printWidth, setPrintWidth] = useState(210);
  const [printHeight, setPrintHeight] = useState(297);
  const [dpi, setDpi] = useState(300);
  const [bleed, setBleed] = useState(3);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [videoSize, setVideoSize] = useState('1280x720');
  const [videoDuration, setVideoDuration] = useState(2);
  const [videoDirection, setVideoDirection] = useState<
    'left' | 'right' | 'up' | 'down'
  >('left');
  const [videoCycles, setVideoCycles] = useState(1);
  const [videoWidth, videoHeight] = videoSize.split('x').map(Number);
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
      ...CANVAS_SIZES.map((size, index) => ({
        label: `size-${index}`,
        width: size[1],
        height: size[2],
      })),
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
      ...PALETTE_OPTIONS.map((item) => ({
        label: item.id,
        background: item.colors[0],
        colors: item.colors.slice(1),
      })),
      ...brandPalettes.map((item) => ({
        label: `brand-${item.id}`,
        background: item.background,
        colors: item.colors,
      })),
    ],
    [document.canvas.background, document.palette, brandPalettes],
  );
  const batchJobs = useMemo(
    () =>
      batchSizes
        .filter((size) => selectedSizes.includes(size.label))
        .flatMap((size) =>
          batchPalettes
            .filter((palette) => selectedPalettes.includes(palette.label))
            .map((palette, paletteIndex) => {
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
    [
      batchPalettes,
      batchSizes,
      document,
      effectiveTransparent,
      fit,
      selectedSizes,
      selectedPalettes,
    ],
  );

  const firstBatchJob = batch ? batchJobs[0] : undefined;
  function setDimensions(nextWidth: number, nextHeight: number) {
    setWidth(nextWidth);
    setHeight(nextHeight);
    setWidthDraft(String(nextWidth));
    setHeightDraft(String(nextHeight));
  }
  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setFormat(recommendedFormat);
      setDimensions(document.canvas.width, document.canvas.height);
      setTransparent(document.canvas.transparent);
      setTileOnly(false);
      setMessage('');
      try {
        setBrandPalettes(readBrandPalettes());
      } catch {
        setBrandPalettes([]);
        setMessage(
          en
            ? 'Saved palettes could not be loaded.'
            : '保存済み配色を読み込めませんでした。',
        );
      }
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
    if (!batchJobs.length || batchJobs.length > 12)
      throw new Error(
        en
          ? 'Select 1–12 batch files.'
          : '一括出力は1〜12ファイルになるよう選んでください。',
      );
    if (!['png', 'svg', 'jpg', 'webp'].includes(format))
      throw new Error(
        en
          ? 'Batch export supports image formats.'
          : '一括書き出しは画像形式を選んでください。',
      );
    const files: Record<string, Uint8Array> = {};
    for (const job of batchJobs) {
      const filename = `${safeName(`${name}-${job.size.label}-${job.palette.label}`)}.${format}`;
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
          encodeProjectFile(
            createLocalProject(
              name,
              snapshot ?? {
                sessionVersion: 1,
                document,
                presetId: null,
                presetName: name,
                activeLayerId: document.layers[0]?.id ?? null,
              },
            ),
          ),
          `${safeName(name)}.kikamoyo.json`,
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
          outputWidth: videoWidth,
          outputHeight: videoHeight,
          duration: videoDuration,
          direction: videoDirection,
          cycles: videoCycles,
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
            batchJobs.length <= 12 &&
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
        <DialogTrigger
          render={<Button id="export-action" className="ml-1 px-3" />}
        >
          <Download data-icon="inline-start" />
          {en ? 'Export' : '書き出し'}
        </DialogTrigger>
        <DialogContent
          closeLabel={en ? 'Close' : '閉じる'}
          className="max-h-[calc(100dvh-1rem)] max-w-[min(720px,calc(100vw-1rem))] overflow-y-auto overscroll-contain p-0"
        >
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
          <fieldset
            disabled={busy}
            className="grid min-w-0 gap-5 px-4 py-4 sm:px-5"
          >
            <legend className="sr-only">
              {en ? 'Export settings' : '書き出し設定'}
            </legend>
            <p className="ui-help">
              {format === 'json'
                ? en
                  ? 'Editable project: open this file from Projects → Import. The original artwork and generation settings are preserved.'
                  : '再編集用ファイルです。「プロジェクト → 読込」で続きを編集できます。元の模様と生成設定を保存します。'
                : en
                  ? `Recommended for this use: ${recommendedFormat.toUpperCase()}. PNG supports transparency; SVG stays sharp; JSON keeps editable settings.`
                  : `この用途のおすすめ: ${recommendedFormat.toUpperCase()}。PNGは透過素材、SVGは拡大用、JSONは再編集用です。`}
            </p>
            {!['json', 'webm'].includes(format) && (
              <figure className="space-y-2">
                <figcaption className="text-sm font-medium">
                  {batch
                    ? en
                      ? 'First selected file preview'
                      : '選択した最初のファイルのプレビュー'
                    : en
                      ? 'Output preview'
                      : '書き出しプレビュー'}
                </figcaption>
                <div
                  className="checker mx-auto max-h-80 w-full max-w-sm overflow-hidden rounded-lg border"
                  style={{
                    aspectRatio: `${firstBatchJob?.size.width ?? width}/${firstBatchJob?.size.height ?? height}`,
                  }}
                >
                  <PatternCanvas
                    document={
                      firstBatchJob?.document ?? {
                        ...document,
                        canvas: {
                          ...document.canvas,
                          transparent: effectiveTransparent,
                        },
                      }
                    }
                    viewport={!batch && tileOnly ? 'fundamentalTile' : 'canvas'}
                    viewBox={firstBatchJob?.viewBox ?? viewBox}
                    outputWidth={firstBatchJob?.size.width ?? width}
                    outputHeight={firstBatchJob?.size.height ?? height}
                    maxObjects={5000}
                    className="h-full w-full"
                  />
                </div>
              </figure>
            )}
            {format === 'webm' &&
              (document.canvas.seamless ? (
                <LoopPreview
                  document={document}
                  width={videoWidth}
                  height={videoHeight}
                  cellWidth={repeatPlan.width}
                  cellHeight={repeatPlan.height}
                  duration={videoDuration}
                  cycles={videoCycles}
                  direction={videoDirection}
                  locale={locale}
                />
              ) : (
                <output>
                  {en
                    ? 'Enable seamless repeat in the editor before exporting a loop video.'
                    : '動画を書き出すには、編集画面でシームレスを有効にしてください。'}
                </output>
              ))}
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
                      setMessage('');
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
            {format === 'webm' && (
              <fieldset className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
                <legend>{en ? 'Loop video' : 'ループ動画'}</legend>
                <label>
                  {en ? 'Resolution' : '動画サイズ'}
                  <select
                    className="mt-1 w-full rounded border p-2"
                    value={videoSize}
                    onChange={(event) => setVideoSize(event.target.value)}
                  >
                    {['512x512', '1280x720', '720x1280', '1920x1080'].map(
                      (size) => (
                        <option key={size} value={size}>
                          {size.replace('x', ' × ')}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  {en ? 'Length (seconds)' : '長さ（秒）'}
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={videoDuration}
                    onChange={(event) =>
                      setVideoDuration(
                        Math.min(
                          10,
                          Math.max(1, Number(event.target.value) || 2),
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  {en ? 'Direction' : '移動方向'}
                  <select
                    className="mt-1 w-full rounded border p-2"
                    value={videoDirection}
                    onChange={(event) =>
                      setVideoDirection(
                        event.target.value as typeof videoDirection,
                      )
                    }
                  >
                    {(['left', 'right', 'up', 'down'] as const).map(
                      (direction, index) => (
                        <option key={direction} value={direction}>
                          {en ? direction : ['左', '右', '上', '下'][index]}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  {en
                    ? 'Speed (tile cycles per clip)'
                    : '速度（動画内の繰り返し回数）'}
                  <Input
                    type="number"
                    min={1}
                    max={4}
                    value={videoCycles}
                    onChange={(event) =>
                      setVideoCycles(
                        Math.min(
                          4,
                          Math.max(
                            1,
                            Math.round(Number(event.target.value) || 1),
                          ),
                        ),
                      )
                    }
                  />
                </label>
                <p className="ui-help sm:col-span-2">
                  {en
                    ? 'Opaque WebM, targeting 24 fps. Frame rate and duration may vary with device load. Integer tile cycles keep the loop seamless. Recording takes about the selected duration.'
                    : '背景あり・24fps目標のWebM。端末負荷によりフレーム数や長さが多少変動します。整数回の移動で端をつなぎます。生成には指定した秒数程度かかります。'}
                </p>
              </fieldset>
            )}
            {format !== 'json' && format !== 'webm' && (
              <div className="grid gap-4 sm:grid-cols-2">
                {!batch && (
                  <div className="space-y-3">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {en ? 'Output size' : '出力サイズ'}
                    </span>
                    <Select onValueChange={chooseSize}>
                      <SelectTrigger
                        className="w-full"
                        aria-label={en ? 'Output size' : '出力サイズ'}
                      >
                        <SelectValue>
                          {width} × {height}
                        </SelectValue>
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
                )}
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
            )}
            {format !== 'json' && format !== 'webm' && (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border p-3 text-sm">
                  <span>{en ? 'Fundamental tile only' : '基本タイルだけ'}</span>
                  <Switch
                    aria-label={en ? 'Fundamental tile only' : '基本タイルだけ'}
                    checked={tileOnly}
                    disabled={!document.canvas.seamless || batch}
                    onCheckedChange={toggleTile}
                  />
                </div>
                {['svg', 'css'].includes(format) && (
                  <div className="flex items-center justify-between rounded-xl border p-3 text-sm">
                    <span>{en ? 'Optimize SVG' : 'SVGを最適化'}</span>
                    <Switch
                      aria-label={en ? 'Optimize SVG' : 'SVGを最適化'}
                      checked={optimize}
                      onCheckedChange={setOptimize}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between rounded-xl border p-3 text-sm">
                  <span>{en ? 'Transparent background' : '背景を透明'}</span>
                  <Switch
                    aria-label={en ? 'Transparent background' : '背景を透明'}
                    checked={effectiveTransparent}
                    disabled={format === 'jpg'}
                    onCheckedChange={setTransparent}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3 text-sm">
                  <span>
                    {en
                      ? 'Batch ZIP: select sizes & colors'
                      : '一括ZIP: サイズ・配色を選ぶ'}
                  </span>
                  <Switch
                    aria-label={en ? 'Batch export' : '一括書き出し'}
                    checked={batch}
                    disabled={!['png', 'svg', 'jpg', 'webp'].includes(format)}
                    onCheckedChange={(value) => {
                      setBatch(value);
                      if (value) setTileOnly(false);
                    }}
                  />
                </div>
              </div>
            )}
            {batch && (
              <div className="space-y-3 rounded-xl border p-3">
                <fieldset>
                  <legend className="text-sm font-semibold">
                    {en ? 'Sizes' : 'サイズ'}
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {batchSizes.map((size) => (
                      <label key={size.label} className="text-xs">
                        <input
                          type="checkbox"
                          checked={selectedSizes.includes(size.label)}
                          onChange={(event) =>
                            setSelectedSizes(
                              event.target.checked
                                ? [...selectedSizes, size.label]
                                : selectedSizes.filter(
                                    (id) => id !== size.label,
                                  ),
                            )
                          }
                        />{' '}
                        {size.label === 'original'
                          ? en
                            ? 'Original'
                            : '元のサイズ'
                          : ''}{' '}
                        {size.width} × {size.height}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="text-sm font-semibold">
                    {en ? 'Palettes' : '配色'}
                  </legend>
                  <div className="mt-2 grid max-h-40 grid-cols-2 gap-2 overflow-y-auto">
                    {batchPalettes.map((palette) => (
                      <label key={palette.label} className="text-xs">
                        <input
                          type="checkbox"
                          checked={selectedPalettes.includes(palette.label)}
                          onChange={(event) =>
                            setSelectedPalettes(
                              event.target.checked
                                ? [...selectedPalettes, palette.label]
                                : selectedPalettes.filter(
                                    (id) => id !== palette.label,
                                  ),
                            )
                          }
                        />{' '}
                        {palette.label === 'original'
                          ? en
                            ? 'Current colors'
                            : '現在の配色'
                          : palette.label.startsWith('brand-')
                            ? brandPalettes.find(
                                (item) => `brand-${item.id}` === palette.label,
                              )?.name
                            : paletteLabel(palette.label, locale)}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <output className="block text-sm">
                  {selectedSizes.length} × {selectedPalettes.length} ={' '}
                  {batchJobs.length}{' '}
                  {en
                    ? 'files (1–12). Preview shows the first selected file. Each file uses its selected palette. Batch uses the full composition, not a tile cell.'
                    : 'ファイル（1〜12）。上のプレビューは選択した最初のファイルです。各ファイルに選択配色を適用します。一括出力は基本タイルではなく作品全体の構図です。'}
                </output>
              </div>
            )}
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
            {!batch && !['css', 'json', 'webm'].includes(format) && (
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
            )}
            {document.canvas.seamless && !['json', 'webm'].includes(format) && (
              <Button variant="outline" onClick={inspect} disabled={busy}>
                <ScanLine />
                {en ? 'Run pixel seam check' : 'ピクセル継ぎ目検査'}
              </Button>
            )}
            <div className="rounded-lg bg-muted/55 px-3 py-2 text-xs text-muted-foreground">
              {format === 'json'
                ? en
                  ? 'Editable project JSON'
                  : '再編集用プロジェクトJSON'
                : format === 'webm'
                  ? `${videoWidth} × ${videoHeight} px · ${videoDuration}s · ${en ? 'target 24fps' : '24fps目標'}`
                  : batch
                    ? en
                      ? `ZIP: ${batchJobs.length} composition-preserving files`
                      : `ZIP: 構図を保った${batchJobs.length}ファイル`
                    : `${width * (['svg', 'css', 'json'].includes(format) ? 1 : scale)} × ${height * (['svg', 'css', 'json'].includes(format) ? 1 : scale)} px`}
            </div>
            <p
              className="min-h-5 text-xs text-muted-foreground"
              aria-live="polite"
            >
              {message && (
                <span className="inline-flex items-center gap-1.5">
                  {message}
                </span>
              )}
            </p>
          </fieldset>
          <DialogFooter className="sticky bottom-0 border-t bg-background px-4 py-4 sm:px-5">
            <Button
              onClick={download}
              disabled={
                busy ||
                (batch && (batchJobs.length < 1 || batchJobs.length > 12)) ||
                (format === 'webm' && !document.canvas.seamless)
              }
              className="min-w-40"
            >
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
