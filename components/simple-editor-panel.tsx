'use client';

import { Palette, Sparkles } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { INITIAL_PRESET, PALETTE_OPTIONS, STYLE_PRESETS } from '@/data/presets';
import { PURPOSE_PRESETS } from '@/data/purpose-presets';
import type { Locale } from '@/lib/i18n';
import { describePattern } from '@/lib/pattern-summary';
import { PatternCanvas } from '@/lib/pattern-engine';
import type {
  EditorDocument,
  PatternLayer,
  PatternType,
  RepeatMode,
} from '@/lib/pattern-types';
import { RandomLockControls } from '@/components/random-lock-controls';
import { BrandPaletteDialog } from '@/components/brand-palette-dialog';
import type { RandomLocks } from '@/lib/random-locks';

const STYLES: Array<{
  type: PatternType;
  ja: string;
  en: string;
  sample: EditorDocument;
}> = [
  {
    type: 'triangles',
    ja: 'リピート',
    en: 'Repeat',
    sample: INITIAL_PRESET.document,
  },
  {
    type: 'lowPoly',
    ja: 'ローポリ',
    en: 'Low poly',
    sample: STYLE_PRESETS[0].document,
  },
  {
    type: 'geoCollage',
    ja: 'ミックス',
    en: 'Mix',
    sample: STYLE_PRESETS[6].document,
  },
  {
    type: 'glassShards',
    ja: 'ライン',
    en: 'Lines',
    sample: STYLE_PRESETS[10].document,
  },
  {
    type: 'quarterTiles',
    ja: 'カーブ',
    en: 'Curves',
    sample: STYLE_PRESETS[13].document,
  },
];

function EasyRange({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="block space-y-2">
      <span className="flex justify-between text-sm font-medium">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {Math.round(value)}%
        </span>
      </span>
      <input
        aria-label={label}
        className="easy-range w-full accent-[var(--primary)]"
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

export function SimpleEditorPanel({
  document,
  activeLayer,
  locale,
  purposeId,
  showSafeArea,
  locks,
  onApplyStyle,
  onPatchLayer,
  onPatchCanvas,
  onApplyPalette,
  onPurpose,
  onSafeArea,
  onLocks,
}: {
  document: EditorDocument;
  activeLayer: PatternLayer;
  locale: Locale;
  purposeId: string | null;
  showSafeArea: boolean;
  locks: RandomLocks;
  onApplyStyle: (type: PatternType) => void;
  onPatchLayer: (
    patch: Partial<PatternLayer['config']> & { opacity?: number },
  ) => void;
  onPatchCanvas: (patch: Partial<EditorDocument['canvas']>) => void;
  onApplyPalette: (background: string, colors: string[]) => void;
  onPurpose: (id: string) => void;
  onSafeArea: (value: boolean) => void;
  onLocks: (value: RandomLocks) => void;
}) {
  const en = locale === 'en';
  return (
    <div className="space-y-6 p-4">
      <section className="space-y-3">
        <div>
          <h2 className="section-label">{en ? 'Style' : 'スタイル'}</h2>
          <p className="ui-help mt-1 text-muted-foreground">
            {en
              ? 'Choose a look, then fine-tune three controls.'
              : '見た目を選び、3つの項目だけで整えます。'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {STYLES.map((style) => (
            <button
              key={style.type}
              type="button"
              onClick={() => onApplyStyle(style.type)}
              className={`overflow-hidden rounded-xl border text-left ${activeLayer.type === style.type || (style.type === 'triangles' && !['lowPoly', 'geoCollage', 'glassShards', 'quarterTiles'].includes(activeLayer.type)) ? 'border-primary ring-2 ring-primary/15' : 'border-input'}`}
            >
              <span className="block aspect-[8/4] overflow-hidden bg-muted">
                <PatternCanvas
                  decorative
                  document={style.sample}
                  maxObjects={48}
                  className="h-full w-full"
                />
              </span>
              <strong className="block px-2 py-2 text-xs">
                {en ? style.en : style.ja}
              </strong>
            </button>
          ))}
        </div>
      </section>
      <section className="space-y-4">
        <EasyRange
          label={en ? 'Detail' : '細かさ'}
          value={Math.min(100, activeLayer.config.density)}
          onChange={(density) => onPatchLayer({ density })}
        />
        <EasyRange
          label={en ? 'Variation' : 'ばらつき'}
          value={activeLayer.config.roughness}
          onChange={(roughness) =>
            onPatchLayer({
              roughness,
              jitterPosition: roughness,
              jitterRotation: roughness,
              jitterSize: Math.round(roughness * 0.65),
            })
          }
        />
        <EasyRange
          label={en ? 'Opacity' : '濃さ'}
          value={activeLayer.opacity * 100}
          onChange={(opacity) => onPatchLayer({ opacity: opacity / 100 })}
        />
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-label">{en ? 'Colors' : '色'}</h2>
          <Palette className="size-4 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {PALETTE_OPTIONS.slice(0, 12).map((option) => (
            <button
              key={option.id}
              type="button"
              className="rounded-lg border p-2"
              onClick={() =>
                onApplyPalette(option.colors[0], option.colors.slice(1))
              }
            >
              <span className="flex overflow-hidden rounded-full">
                {option.colors.map((color, index) => (
                  <span
                    key={`${color}-${index}`}
                    className="h-3 flex-1"
                    style={{ background: color }}
                  />
                ))}
              </span>
            </button>
          ))}
        </div>
        <BrandPaletteDialog
          document={document}
          locale={locale}
          onApply={onApplyPalette}
        />
      </section>
      <section className="space-y-3">
        <h2 className="section-label">{en ? 'Use & size' : '用途とサイズ'}</h2>
        <Select
          value={purposeId ?? ''}
          onValueChange={(value) => value && onPurpose(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={en ? 'Choose a use' : '用途を選ぶ'} />
          </SelectTrigger>
          <SelectContent>
            {PURPOSE_PRESETS.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {en ? item.labelEn : item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center justify-between rounded-xl border p-3">
          <span>
            <strong className="ui-label block">
              {en ? 'Safe area' : '安全域'}
            </strong>
            <span className="ui-help text-muted-foreground">
              {en
                ? 'Guide only; never exported.'
                : 'ガイドだけを表示。書き出しには入りません。'}
            </span>
          </span>
          <Switch checked={showSafeArea} onCheckedChange={onSafeArea} />
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="section-label">{en ? 'Repeat' : 'リピート方式'}</h2>
        <Select
          value={document.canvas.repeatMode ?? 'straight'}
          onValueChange={(value) =>
            value &&
            onPatchCanvas({ repeatMode: value as RepeatMode, seamless: true })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="straight">
              {en ? 'Straight repeat' : '通常リピート'}
            </SelectItem>
            <SelectItem value="halfDrop">
              {en ? 'Half drop' : 'ハーフドロップ'}
            </SelectItem>
            <SelectItem value="mirrorX">
              {en ? 'Mirror horizontally' : '左右ミラー'}
            </SelectItem>
            <SelectItem value="mirrorY">
              {en ? 'Mirror vertically' : '上下ミラー'}
            </SelectItem>
            <SelectItem value="mirrorBoth">
              {en ? 'Mirror both' : '上下左右ミラー'}
            </SelectItem>
          </SelectContent>
        </Select>
      </section>
      <RandomLockControls value={locks} locale={locale} onChange={onLocks} />
      <details className="rounded-xl border bg-muted/25 p-3">
        <summary className="cursor-pointer text-sm font-semibold">
          <Sparkles className="mr-1 inline size-4" />
          {en ? 'Current pattern' : '現在の模様'}
        </summary>
        <p className="ui-help mt-2 leading-relaxed text-muted-foreground">
          {describePattern(document, locale)}
        </p>
      </details>
    </div>
  );
}
