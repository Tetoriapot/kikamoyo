'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  CopyPlus,
  Eye,
  EyeOff,
  FlipHorizontal2,
  FlipVertical2,
  Frame,
  Grid2X2,
  Heart,
  Layers3,
  Maximize,
  Palette,
  Plus,
  Redo2,
  RotateCw,
  Save,
  Search,
  Share2,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Undo2,
  WandSparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import { ExportDialog } from '@/components/export-dialog';
import {
  DisplaySettingsDialog,
  type DisplayPreferences,
} from '@/components/display-settings-dialog';
import { BrandPaletteDialog } from '@/components/brand-palette-dialog';
import { ProjectManagerDialog } from '@/components/project-manager-dialog';
import { RandomLockControls } from '@/components/random-lock-controls';
import { SafeAreaOverlay } from '@/components/safe-area-overlay';
import { SimpleEditorPanel } from '@/components/simple-editor-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ALL_PRESETS,
  CATEGORY_OPTIONS,
  INITIAL_PRESET,
  PALETTE_OPTIONS,
  STYLE_PRESETS,
  presetDocument,
} from '@/data/presets';
import { PURPOSE_PRESETS, purposePreset } from '@/data/purpose-presets';
import { usePatternEditor } from '@/hooks/use-pattern-editor';
import { encodeShareState } from '@/lib/export-pattern';
import { t, type Locale } from '@/lib/i18n';
import {
  generateOmakase,
  inferLegacyOmakaseGeneration,
  OMAKASE_CATEGORIES,
} from '@/lib/omakase';
import { PatternCanvas } from '@/lib/pattern-engine';
import { describePattern } from '@/lib/pattern-summary';
import { matchesPresetSearch } from '@/lib/preset-search';
import {
  DEFAULT_RANDOM_LOCKS,
  mergeLockedRandomChannels,
  type RandomLocks,
} from '@/lib/random-locks';
import { getRepeatPlan } from '@/lib/repeat-layout';
import { hashUnit } from '@/lib/seed';
import {
  BLEND_MODES,
  CANVAS_SIZES,
  PATTERN_LABELS,
  PATTERN_TYPES,
  PLACEMENT_LABELS,
  PLACEMENT_TYPES,
  cloneDocument,
  isEditorDocument,
  isEditorSnapshot,
  type EditorDocument,
  type EditorSnapshot,
  type OmakaseGeneration,
  type PatternPreset,
  type PatternType,
  type RepeatMode,
} from '@/lib/pattern-types';

const AUTO_COLOR_MODES = [
  ['random', 'ランダム'],
  ['complement', '補色'],
  ['analogous', '類似色'],
  ['triad', '三色配色'],
  ['tetrad', '四色配色'],
  ['mono', 'モノクローム'],
  ['lightness', '明度違い'],
  ['saturation', '彩度違い'],
] as const;

const AUTO_COLOR_LABELS_EN: Record<string, string> = {
  random: 'Random',
  complement: 'Complementary',
  analogous: 'Analogous',
  triad: 'Triadic',
  tetrad: 'Tetradic',
  mono: 'Monochrome',
  lightness: 'Lightness steps',
  saturation: 'Saturation steps',
};

const PALETTE_LABELS: Record<string, string> = {
  monochrome: 'モノクロ',
  grayscale: 'グレースケール',
  pastel: 'パステル',
  vivid: 'ビビッド',
  retro: 'レトロ',
  nordic: '北欧',
  japanese: '和風',
  night: '夜空',
  ocean: '海',
  forest: '森',
  autumn: '秋',
  sakura: '桜',
  gold: 'ゴールド',
  neon: 'ネオン',
  cyber: 'サイバー',
  artdeco: 'アールデコ',
  oldbook: '古書',
  cream: 'クリーム',
  darkfantasy: 'ダークファンタジー',
  magic: '魔法',
  polygonSunset: 'ポリゴン・夕景',
  polygonPrism: 'ポリゴン・虹',
  polygonHoney: 'ハニー',
  polygonBlue: 'ブルー・ファセット',
  polygonLavender: 'ラベンダー',
  memphisMint: 'メンフィス・ミント',
  memphisCyan: 'シアン・レモン',
  shardPastel: 'パステル・シャード',
  shardNeon: 'ネオン・シャード',
  curveMono: 'カーブ・モノクロ',
};

const CATEGORY_LABELS_EN: Record<string, string> = {
  all: 'All',
  abstract: 'Abstract',
  basic: 'Basic',
  line: 'Lines',
  wave: 'Waves',
  circle: 'Circles',
  block: 'Blocks',
  japanese: 'Japanese',
  artdeco: 'Art deco',
  retro: 'Retro',
  scifi: 'Sci-fi',
  magic: 'Magic',
};

const OMAKASE_LABELS_EN: Record<string, string> = {
  all: 'Fully random',
  basic: 'Simple',
  cute: 'Cute',
  cool: 'Cool',
  abstract: 'Abstract',
  japanese: 'Japanese',
  retro: 'Retro',
  scifi: 'Sci-fi',
  magic: 'Magic',
  artdeco: 'Premium',
  pop: 'Pop',
  dark: 'Dark',
  trpg: 'Tabletop RPG',
  background: 'Background',
};

const PATTERN_LABELS_EN: Record<PatternType, string> = {
  dots: 'Dots',
  circles: 'Circles',
  ellipse: 'Ellipses',
  squares: 'Squares',
  rectangles: 'Rectangles',
  triangles: 'Triangles',
  diamonds: 'Diamonds',
  hexagons: 'Hexagons',
  octagons: 'Octagons',
  stars: 'Stars',
  crosses: 'Crosses',
  lines: 'Lines',
  doubleLines: 'Double lines',
  waves: 'Waves',
  zigzag: 'Zigzag',
  chevron: 'Chevron',
  arcs: 'Arcs',
  rings: 'Rings',
  radial: 'Radial',
  lowPoly: 'Low poly',
  glassShards: 'Translucent shards',
  geoCollage: 'Geometric mix',
  quarterTiles: 'Quarter-circle tiles',
};

const PLACEMENT_LABELS_EN: Record<string, string> = {
  grid: 'Grid',
  offsetGrid: 'Offset grid',
  brick: 'Brick',
  hexGrid: 'Honeycomb',
  checker: 'Checker',
  diagonal: 'Diagonal',
  radial: 'Radial',
  concentric: 'Concentric',
  wave: 'Wave',
  stripe: 'Stripe',
  random: 'Random',
  pseudoRandom: 'Pseudo-random',
  tile: 'Tile',
  kaleidoscope: 'Kaleidoscope',
  symmetric: 'Symmetric',
};

const BLEND_LABELS_EN: Record<string, string> = {
  normal: 'Normal',
  multiply: 'Multiply',
  screen: 'Screen',
  overlay: 'Overlay',
  darken: 'Darken',
  lighten: 'Lighten',
  difference: 'Difference',
};

interface UserPreset {
  id: string;
  name: string;
  document: EditorDocument;
}

interface RandomHistoryEntry {
  document: EditorDocument;
  generation?: OmakaseGeneration;
}

type VisualStyle =
  | 'repeat'
  | 'lowPoly'
  | 'geoCollage'
  | 'glassShards'
  | 'quarterTiles';

const LINE_PATTERN_TYPES = new Set<PatternType>([
  'lines',
  'doubleLines',
  'waves',
  'zigzag',
  'chevron',
  'arcs',
  'rings',
  'radial',
]);

const VISUAL_STYLES: Array<{
  value: VisualStyle;
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
  type: PatternType;
  sample: EditorDocument;
}> = [
  {
    value: 'repeat',
    label: 'リピート',
    labelEn: 'Repeat',
    description: '同じ図形を並べる',
    descriptionEn: 'Arrange repeating shapes',
    type: 'triangles',
    sample: INITIAL_PRESET.document,
  },
  {
    value: 'lowPoly',
    label: 'ローポリ',
    labelEn: 'Low poly',
    description: '三角面で色をつなぐ',
    descriptionEn: 'Connect color with facets',
    type: 'lowPoly',
    sample: STYLE_PRESETS[0].document,
  },
  {
    value: 'geoCollage',
    label: 'ミックス',
    labelEn: 'Mix',
    description: '丸・線・三角を散らす',
    descriptionEn: 'Scatter circles, lines and triangles',
    type: 'geoCollage',
    sample: STYLE_PRESETS[6].document,
  },
  {
    value: 'glassShards',
    label: 'ライン',
    labelEn: 'Lines',
    description: '半透明の線を重ねる',
    descriptionEn: 'Layer translucent shards',
    type: 'glassShards',
    sample: STYLE_PRESETS[10].document,
  },
  {
    value: 'quarterTiles',
    label: 'カーブ',
    labelEn: 'Curves',
    description: '1/4円を組み合わせる',
    descriptionEn: 'Combine quarter circles',
    type: 'quarterTiles',
    sample: STYLE_PRESETS[13].document,
  },
];

function visualStyleForType(type: PatternType): VisualStyle {
  return ['lowPoly', 'geoCollage', 'glassShards', 'quarterTiles'].includes(type)
    ? (type as VisualStyle)
    : 'repeat';
}

function parseRandomHistory(value: unknown): RandomHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  const entries: RandomHistoryEntry[] = [];
  for (const item of value) {
    if (isEditorDocument(item)) {
      const generation = inferLegacyOmakaseGeneration(item);
      entries.push({ document: item, ...(generation ? { generation } : {}) });
      continue;
    }
    if (
      !item ||
      typeof item !== 'object' ||
      !('document' in item) ||
      !isEditorDocument(item.document)
    )
      continue;
    const generation =
      'generation' in item &&
      item.generation &&
      typeof item.generation === 'object' &&
      'kind' in item.generation &&
      item.generation.kind === 'omakase' &&
      'category' in item.generation &&
      typeof item.generation.category === 'string' &&
      'algorithmVersion' in item.generation &&
      [1, 2].includes(Number(item.generation.algorithmVersion))
        ? (item.generation as OmakaseGeneration)
        : undefined;
    entries.push({
      document: item.document,
      ...(generation ? { generation } : {}),
    });
  }
  return entries.slice(0, 10);
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - chroma / 2;
  const [r, g, b] =
    hue < 60
      ? [chroma, x, 0]
      : hue < 120
        ? [x, chroma, 0]
        : hue < 180
          ? [0, chroma, x]
          : hue < 240
            ? [0, x, chroma]
            : hue < 300
              ? [x, 0, chroma]
              : [chroma, 0, x];
  return `#${[r, g, b]
    .map((value) =>
      Math.round((value + m) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

function freshSeed() {
  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);
  return 100000 + (values[0] % 900000);
}

function seededUnit(seed: number, key: number, channel = 0) {
  return hashUnit(seed, 'kikamoyo-generator', key, channel);
}

function subscribeToMedia(query: string, callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (callback) => subscribeToMedia(query, callback),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

function colorScheme(mode: (typeof AUTO_COLOR_MODES)[number][0], seed: number) {
  const base = Math.floor(seededUnit(seed, 0) * 360);
  if (mode === 'random')
    return Array.from({ length: 5 }, (_, index) =>
      hslToHex(
        seededUnit(seed, index, 1) * 360,
        62 + seededUnit(seed, index, 2) * 22,
        48 + seededUnit(seed, index, 3) * 18,
      ),
    );
  if (mode === 'complement')
    return [0, 180, 25, 205, 335].map((offset, index) =>
      hslToHex((base + offset + 360) % 360, 62, 44 + index * 5),
    );
  if (mode === 'analogous')
    return [-42, -20, 0, 20, 42].map((offset, index) =>
      hslToHex((base + offset + 360) % 360, 60, 43 + index * 6),
    );
  if (mode === 'triad')
    return [0, 120, 240, 30, 210].map((offset, index) =>
      hslToHex((base + offset) % 360, 66, 45 + index * 5),
    );
  if (mode === 'tetrad')
    return [0, 90, 180, 270, 45].map((offset, index) =>
      hslToHex((base + offset) % 360, 61, 44 + index * 5),
    );
  if (mode === 'mono')
    return [24, 36, 49, 63, 78].map((lightness) =>
      hslToHex(base, 12, lightness),
    );
  if (mode === 'lightness')
    return [25, 36, 48, 62, 76].map((lightness) =>
      hslToHex(base, 64, lightness),
    );
  return [24, 40, 56, 72, 88].map((saturation, index) =>
    hslToHex(base, saturation, 46 + index * 5),
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  const controlId = useId();
  const displayedValue = Number(value.toFixed(step < 1 ? 1 : 0));
  function commitNumber(target: HTMLInputElement) {
    const parsed = Number(target.value);
    const next = Number.isFinite(parsed)
      ? Math.min(max, Math.max(min, parsed))
      : displayedValue;
    target.value = String(next);
    onChange(next);
  }
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <label
          id={`${controlId}-label`}
          htmlFor={`${controlId}-number`}
          className="text-[13px] font-medium text-foreground/80"
        >
          {label}
        </label>
        <div className="flex h-7 items-center rounded-md border border-border bg-background px-2 text-xs tabular-nums text-muted-foreground">
          <input
            key={displayedValue}
            id={`${controlId}-number`}
            aria-label={`${label}の数値`}
            className="w-12 bg-transparent text-right text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="number"
            min={min}
            max={max}
            step={step}
            defaultValue={displayedValue}
            onBlur={(event) => commitNumber(event.currentTarget)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
          <span className="ml-1">{unit}</span>
        </div>
      </div>
      <Slider
        aria-labelledby={`${controlId}-label`}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(next) =>
          onChange(Number(Array.isArray(next) ? (next[0] ?? value) : next))
        }
      />
    </div>
  );
}

function HexInput({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
}) {
  function commit(target: HTMLInputElement) {
    const next = target.value.trim();
    if (/^#[0-9a-f]{6}$/i.test(next)) onCommit(next.toLowerCase());
    else target.value = value;
  }
  return (
    <Input
      key={value}
      aria-label={label}
      defaultValue={value}
      inputMode="text"
      maxLength={7}
      onBlur={(event) => commit(event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
      }}
    />
  );
}

function DeferredNumberInput({
  label,
  value,
  min,
  max,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
}) {
  function commit(target: HTMLInputElement) {
    const parsed = Number(target.value);
    const next = Number.isFinite(parsed)
      ? Math.min(max, Math.max(min, Math.round(parsed)))
      : value;
    target.value = String(next);
    onCommit(next);
  }
  return (
    <Input
      key={value}
      aria-label={label}
      type="number"
      min={min}
      max={max}
      defaultValue={value}
      onBlur={(event) => commit(event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
      }}
    />
  );
}

function PresetCard({
  preset,
  active,
  favorite,
  locale,
  onLoad,
  onFavorite,
}: {
  preset: PatternPreset;
  active: boolean;
  favorite: boolean;
  locale: Locale;
  onLoad: () => void;
  onFavorite: () => void;
}) {
  return (
    <div
      className={`preset-card group relative overflow-hidden rounded-xl border bg-background transition hover:-translate-y-0.5 hover:shadow-md ${active ? 'border-primary ring-2 ring-primary/15' : 'border-input'}`}
    >
      <button
        type="button"
        onClick={onLoad}
        className="block w-full text-left"
        aria-label={
          locale === 'en' ? `Load ${preset.name}` : `${preset.name}を読み込む`
        }
        aria-pressed={active}
      >
        <span className="block aspect-[8/5] overflow-hidden bg-muted">
          <PatternCanvas
            decorative
            document={preset.document}
            maxObjects={72}
            className="h-full w-full"
          />
        </span>
        <span className="block p-2">
          <strong className="block truncate text-[11px]">{preset.name}</strong>
          <span className="text-[9px] text-muted-foreground">
            {preset.categoryLabel}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onFavorite}
        className={`absolute right-1.5 top-1.5 grid size-10 place-items-center rounded-full border border-white/45 bg-black/35 text-white shadow-sm backdrop-blur-sm transition md:size-7 ${favorite ? 'text-[#ff7b75]' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100'}`}
        aria-label={
          favorite
            ? locale === 'en'
              ? 'Remove from favorites'
              : 'お気に入りから削除'
            : locale === 'en'
              ? 'Add to favorites'
              : 'お気に入りに追加'
        }
        aria-pressed={favorite}
      >
        <Heart className={`size-3.5 ${favorite ? 'fill-current' : ''}`} />
      </button>
    </div>
  );
}

function PresetBrowser({
  presets,
  totalCount,
  activeId,
  favorites,
  category,
  search,
  favoriteOnly,
  recentIds,
  recentRandom,
  onCategory,
  onSearch,
  onFavoriteOnly,
  onLoad,
  onLoadRandom,
  onFavorite,
  locale,
}: {
  presets: PatternPreset[];
  totalCount: number;
  activeId: string;
  favorites: string[];
  category: string;
  search: string;
  favoriteOnly: boolean;
  recentIds: string[];
  recentRandom: RandomHistoryEntry[];
  onCategory: (value: string) => void;
  onSearch: (value: string) => void;
  onFavoriteOnly: () => void;
  onLoad: (preset: PatternPreset) => void;
  onLoadRandom: (entry: RandomHistoryEntry, index: number) => void;
  onFavorite: (id: string) => void;
  locale: Locale;
}) {
  const en = locale === 'en';
  const [visibleCount, setVisibleCount] = useState(30);
  const visiblePresets = presets.slice(0, visibleCount);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold">{en ? 'Presets' : 'プリセット'}</h2>
          <p className="text-[10px] text-muted-foreground">
            {en
              ? `${presets.length} of ${totalCount}`
              : `${presets.length}件（全${totalCount}件）`}
          </p>
        </div>
        <Button
          size="icon-sm"
          variant={favoriteOnly ? 'secondary' : 'ghost'}
          aria-label={en ? 'Show favorites only' : 'お気に入りだけ表示'}
          aria-pressed={favoriteOnly}
          onClick={onFavoriteOnly}
        >
          <Heart className={favoriteOnly ? 'fill-current' : ''} />
        </Button>
      </div>
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
        <Input
          aria-label={en ? 'Search presets' : 'プリセットを検索'}
          className="pl-8"
          placeholder={en ? 'Search names and features' : '名前・特徴で検索'}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
        />
      </div>
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 text-[10px]">
        {CATEGORY_OPTIONS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onCategory(item.value)}
            aria-pressed={category === item.value}
            className={`min-h-9 whitespace-nowrap rounded-full px-2.5 py-1.5 font-medium ${category === item.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
          >
            {en ? (CATEGORY_LABELS_EN[item.value] ?? item.value) : item.label}
          </button>
        ))}
      </div>
      {recentIds.length > 0 &&
        !search &&
        category === 'all' &&
        !favoriteOnly && (
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[.12em] text-muted-foreground">
            {en ? 'Recently used' : '最近使ったもの'} · {recentIds.length}
          </p>
        )}
      {recentRandom.length > 0 &&
        !search &&
        category === 'all' &&
        !favoriteOnly && (
          <div className="mb-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">
              {en ? 'Generation history' : 'おまかせ履歴'} ·{' '}
              {recentRandom.length}
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {recentRandom.slice(0, 10).map((entry, index) => (
                <button
                  key={`${entry.document.seed}-${index}`}
                  type="button"
                  className="aspect-square overflow-hidden rounded-md border border-input bg-muted transition hover:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onLoadRandom(entry, index)}
                  aria-label={
                    en
                      ? `Load generation history ${index + 1}`
                      : `おまかせ履歴${index + 1}を読み込む`
                  }
                >
                  <PatternCanvas
                    decorative
                    document={entry.document}
                    maxObjects={36}
                    className="h-full w-full"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {presets.length ? (
          <>
            <div className="grid grid-cols-2 gap-2.5 pb-3">
              {visiblePresets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  active={activeId === preset.id}
                  favorite={favorites.includes(preset.id)}
                  locale={locale}
                  onLoad={() => onLoad(preset)}
                  onFavorite={() => onFavorite(preset.id)}
                />
              ))}
            </div>
            {visibleCount < presets.length && (
              <Button
                variant="outline"
                className="mb-4 w-full"
                onClick={() => setVisibleCount((value) => value + 30)}
              >
                {en
                  ? `Show more (${presets.length - visibleCount} remaining)`
                  : `さらに表示（残り ${presets.length - visibleCount}）`}
              </Button>
            )}
          </>
        ) : (
          <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border bg-muted/35 p-5 text-center text-xs text-muted-foreground">
            {en
              ? 'No presets match these filters.'
              : '条件に合うプリセットがありません。'}
            <br />
            {en
              ? 'Try another search or category.'
              : '検索やカテゴリーを変更してください。'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const editor = usePatternEditor();
  const currentDocument = editor.document;
  const [tab, setTab] = useState('pattern');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [userPresets, setUserPresets] = useState<UserPreset[]>([]);
  const [recentRandom, setRecentRandom] = useState<RandomHistoryEntry[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [tilePreview, setTilePreview] = useState(false);
  const [editorMode, setEditorMode] = useState<'simple' | 'detail'>('simple');
  const [locale, setLocale] = useState<Locale>('ja');
  const [textSize, setTextSize] = useState<'normal' | 'large'>('normal');
  const [showSafeArea, setShowSafeArea] = useState(true);
  const [purposeId, setPurposeId] = useState<string | null>('sns-square');
  const [randomLocks, setRandomLocks] =
    useState<RandomLocks>(DEFAULT_RANDOM_LOCKS);
  const [zoom, setZoom] = useState(1);
  const [randomCategory, setRandomCategory] = useState('all');
  const [notice, setNotice] = useState('');
  const [settingsReady, setSettingsReady] = useState(false);
  const cloudShareLoaded = useRef(false);
  const isMobileLayout = useMediaQuery('(max-width: 720px)');
  const wideLayout = useMediaQuery('(min-width: 1021px)');

  const activeLayerId =
    editor.activeLayerId ?? currentDocument.layers[0]?.id ?? '';
  const activePresetId = editor.presetId ?? '';
  const activePresetName = editor.presetName;
  const activeLayer =
    currentDocument.layers.find((layer) => layer.id === activeLayerId) ??
    currentDocument.layers[0];
  const activeVisualStyle = activeLayer
    ? visualStyleForType(activeLayer.type)
    : 'repeat';
  const proceduralStyle = activeVisualStyle !== 'repeat';
  const surfaceStyle = ['lowPoly', 'glassShards', 'quarterTiles'].includes(
    activeVisualStyle,
  );
  const effectiveTab = wideLayout && tab === 'presets' ? 'pattern' : tab;
  const effectiveTilePreview = tilePreview && currentDocument.canvas.seamless;
  const repeatPlan = getRepeatPlan(
    currentDocument.canvas.repeatMode ?? 'straight',
    currentDocument.canvas.tileSize,
  );
  const patternDescription = useMemo(
    () => describePattern(currentDocument, locale),
    [currentDocument, locale],
  );
  const selectedPurpose = purposePreset(purposeId);
  const displayPreferences: DisplayPreferences = {
    mode: editorMode,
    locale,
    textSize,
    darkMode,
    showSafeArea,
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const storedFavorites: unknown = JSON.parse(
          window.localStorage.getItem('favorites') ?? '[]',
        );
        const storedRecentIds: unknown = JSON.parse(
          window.localStorage.getItem('recentPresets') ?? '[]',
        );
        const storedUserPresets: unknown = JSON.parse(
          window.localStorage.getItem('userPresets') ?? '[]',
        );
        const storedRecentRandom: unknown = JSON.parse(
          window.localStorage.getItem('recentRandom') ?? '[]',
        );
        setFavorites(
          Array.isArray(storedFavorites)
            ? storedFavorites
                .filter((value): value is string => typeof value === 'string')
                .slice(0, 200)
            : [],
        );
        setRecentIds(
          Array.isArray(storedRecentIds)
            ? storedRecentIds
                .filter((value): value is string => typeof value === 'string')
                .slice(0, 10)
            : [],
        );
        setUserPresets(
          Array.isArray(storedUserPresets)
            ? storedUserPresets
                .filter(
                  (value): value is UserPreset =>
                    Boolean(value) &&
                    typeof value === 'object' &&
                    typeof (value as UserPreset).id === 'string' &&
                    typeof (value as UserPreset).name === 'string' &&
                    isEditorDocument((value as UserPreset).document),
                )
                .slice(0, 40)
            : [],
        );
        setRecentRandom(parseRandomHistory(storedRecentRandom));
        const settings = JSON.parse(
          window.localStorage.getItem('settings') ?? '{}',
        ) as {
          darkMode?: boolean;
          tilePreview?: boolean;
          editorMode?: 'simple' | 'detail';
          locale?: Locale;
          textSize?: 'normal' | 'large';
          showSafeArea?: boolean;
          purposeId?: string | null;
          randomLocks?: Partial<RandomLocks>;
        };
        setDarkMode(Boolean(settings.darkMode));
        setTilePreview(Boolean(settings.tilePreview));
        setEditorMode(settings.editorMode === 'detail' ? 'detail' : 'simple');
        setLocale(settings.locale === 'en' ? 'en' : 'ja');
        setTextSize(settings.textSize === 'large' ? 'large' : 'normal');
        setShowSafeArea(settings.showSafeArea !== false);
        setPurposeId(
          typeof settings.purposeId === 'string'
            ? settings.purposeId
            : 'sns-square',
        );
        setRandomLocks({ ...DEFAULT_RANDOM_LOCKS, ...settings.randomLocks });
      } catch {
        /* Start with safe defaults when storage is corrupt. */
      } finally {
        setSettingsReady(true);
      }
    }, 0);
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production')
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!settingsReady) return;
    try {
      window.localStorage.setItem(
        'settings',
        JSON.stringify({
          darkMode,
          tilePreview,
          editorMode,
          locale,
          textSize,
          showSafeArea,
          purposeId,
          randomLocks,
        }),
      );
    } catch {
      /* Settings remain available for this tab. */
    }
    document.documentElement.lang = locale;
    document.documentElement.dataset.textSize = textSize;
  }, [
    darkMode,
    editorMode,
    locale,
    purposeId,
    randomLocks,
    settingsReady,
    showSafeArea,
    textSize,
    tilePreview,
  ]);

  useEffect(() => {
    if (!editor.hydrated || cloudShareLoaded.current) return;
    const token = new URLSearchParams(window.location.search).get('cloud');
    if (!token) {
      cloudShareLoaded.current = true;
      return;
    }
    cloudShareLoaded.current = true;
    void fetch(`/api/shares/${encodeURIComponent(token)}`, {
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const value = (await response.json()) as { snapshot?: unknown };
        if (!isEditorSnapshot(value.snapshot)) throw new Error();
        const shared = value.snapshot as EditorSnapshot;
        editor.replace(shared.document, {
          presetId: null,
          presetName: `${shared.presetName} · ${locale === 'en' ? 'shared copy' : '共有コピー'}`,
          activeLayerId: shared.activeLayerId,
          ...(shared.generation ? { generation: shared.generation } : {}),
        });
        setNotice(
          locale === 'en'
            ? 'Loaded an immutable cloud copy.'
            : 'クラウド共有コピーを読み込みました',
        );
      })
      .catch(() =>
        setNotice(
          locale === 'en'
            ? 'Could not load the cloud copy.'
            : 'クラウド共有コピーを読み込めませんでした',
        ),
      );
  }, [editor, locale]);

  useEffect(() => {
    if (!editor.generation?.category) return;
    const timer = window.setTimeout(
      () => setRandomCategory(editor.generation?.category ?? 'all'),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [editor.generation?.category]);

  useEffect(() => {
    if (!editor.hydrated || editor.restoreStatus !== 'invalid-shared') return;
    let hideTimer = 0;
    const showTimer = window.setTimeout(() => {
      setNotice(
        locale === 'en'
          ? 'The shared data was invalid, so a safe state was opened.'
          : '共有データが不正なため、安全な状態で開きました',
      );
      hideTimer = window.setTimeout(() => setNotice(''), 2600);
    }, 0);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [editor.hydrated, editor.restoreStatus, locale]);

  const allPresets = useMemo<PatternPreset[]>(
    () => [
      ...userPresets.map((preset) => ({
        id: preset.id,
        name: preset.name,
        category: ['basic'] as PatternPreset['category'],
        categoryLabel: 'MY PRESET',
        tags: ['user', 'favorite'],
        document: preset.document,
      })),
      ...ALL_PRESETS,
    ],
    [userPresets],
  );

  const filteredPresets = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    let result = allPresets.filter(
      (preset) =>
        (category === 'all' || preset.category.includes(category as never)) &&
        (!favoriteOnly || favorites.includes(preset.id)) &&
        (!normalized || matchesPresetSearch(preset, normalized)),
    );
    if (
      !normalized &&
      category === 'all' &&
      !favoriteOnly &&
      recentIds.length
    ) {
      const recent = recentIds
        .map((id) => result.find((preset) => preset.id === id))
        .filter(Boolean) as PatternPreset[];
      result = [
        ...recent,
        ...result.filter((preset) => !recentIds.includes(preset.id)),
      ];
    }
    return result;
  }, [allPresets, category, favoriteOnly, favorites, recentIds, search]);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 1800);
  }

  function applyVisualStyle(style: VisualStyle) {
    const choice = VISUAL_STYLES.find((item) => item.value === style);
    if (!choice || !activeLayer) return;
    const defaults =
      style === 'repeat'
        ? {
            placement: 'offsetGrid' as const,
            size: 30,
            gap: 58,
            density: 64,
            roughness: 18,
            jitterRotation: 18,
            jitterColor: 28,
            jitterOpacity: 8,
            rotation: 0,
            opacity: 1,
          }
        : style === 'lowPoly'
          ? {
              placement: 'grid' as const,
              size: 122,
              gap: 104,
              density: 56,
              roughness: 62,
              jitterRotation: 20,
              jitterColor: 100,
              jitterOpacity: 14,
              rotation: 28,
              opacity: 1,
            }
          : style === 'geoCollage'
            ? {
                placement: 'random' as const,
                size: 42,
                gap: 86,
                density: 64,
                roughness: 54,
                jitterRotation: 100,
                jitterColor: 100,
                jitterOpacity: 18,
                rotation: 0,
                opacity: 1,
              }
            : style === 'glassShards'
              ? {
                  placement: 'random' as const,
                  size: 70,
                  gap: 30,
                  density: 84,
                  roughness: 90,
                  jitterRotation: 100,
                  jitterColor: 100,
                  jitterOpacity: 80,
                  rotation: 12,
                  opacity: 0.86,
                }
              : {
                  placement: 'grid' as const,
                  size: 84,
                  gap: 86,
                  density: 70,
                  roughness: 0,
                  jitterRotation: 0,
                  jitterColor: 35,
                  jitterOpacity: 0,
                  rotation: 0,
                  opacity: 1,
                };
    editor.commit((document) => ({
      ...document,
      layers: document.layers.map((layer) =>
        layer.id === activeLayer.id
          ? {
              ...layer,
              type: choice.type,
              rotation: defaults.rotation,
              opacity: defaults.opacity,
              blendMode: 'normal',
              config: {
                ...layer.config,
                placement: defaults.placement,
                size: defaults.size,
                gap: defaults.gap,
                density: defaults.density,
                roughness: defaults.roughness,
                jitterPosition: defaults.roughness,
                jitterRotation: defaults.jitterRotation,
                jitterSize: Math.round(defaults.roughness * 0.55),
                jitterColor: defaults.jitterColor,
                jitterOpacity: defaults.jitterOpacity,
                strokeWidth:
                  style === 'repeat'
                    ? Math.max(1.5, layer.config.strokeWidth)
                    : 0,
                fillMode: 'fill',
              },
            }
          : layer,
      ),
    }));
    editor.setIdentity({
      presetId: null,
      presetName: `${locale === 'en' ? choice.labelEn : choice.label} ${locale === 'en' ? 'custom' : 'カスタム'}`,
    });
    flash(
      locale === 'en'
        ? `Changed to ${choice.labelEn}; colors and canvas were kept.`
        : `${choice.label}に変更しました。色とキャンバスは保持しています`,
    );
  }

  function applyPatternType(type: PatternType) {
    if (!activeLayer) return;
    const style = visualStyleForType(type);
    if (style !== 'repeat') {
      applyVisualStyle(style);
      return;
    }
    const nextLineLike = LINE_PATTERN_TYPES.has(type);
    editor.commit((document) => ({
      ...document,
      layers: document.layers.map((layer) =>
        layer.id === activeLayer.id
          ? {
              ...layer,
              type,
              config: {
                ...layer.config,
                fillMode: nextLineLike ? 'stroke' : layer.config.fillMode,
                strokeWidth: nextLineLike
                  ? Math.max(1.5, layer.config.strokeWidth)
                  : layer.config.strokeWidth,
              },
            }
          : layer,
      ),
    }));
    editor.setIdentity({
      presetId: null,
      presetName: `${locale === 'en' ? PATTERN_LABELS_EN[type] : PATTERN_LABELS[type]} ${locale === 'en' ? 'custom' : 'カスタム'}`,
    });
  }

  function loadPreset(preset: PatternPreset) {
    editor.replace(presetDocument(preset), {
      presetId: preset.id,
      presetName: preset.name,
      activeLayerId: preset.document.layers[0]?.id ?? null,
    });
    const recent = [
      preset.id,
      ...recentIds.filter((id) => id !== preset.id),
    ].slice(0, 10);
    setRecentIds(recent);
    try {
      window.localStorage.setItem('recentPresets', JSON.stringify(recent));
    } catch {
      /* Keep the recent list in memory. */
    }
    flash(
      locale === 'en'
        ? `Loaded ${preset.name}.`
        : `${preset.name}を読み込みました`,
    );
  }

  function toggleFavorite(id: string) {
    const next = favorites.includes(id)
      ? favorites.filter((value) => value !== id)
      : [id, ...favorites];
    setFavorites(next);
    try {
      window.localStorage.setItem('favorites', JSON.stringify(next));
    } catch {
      /* Keep favorites in memory. */
    }
  }

  function saveUserPreset() {
    const name = window.prompt(
      locale === 'en'
        ? 'Enter a preset name'
        : 'プリセット名を入力してください',
      `${activePresetName} ${locale === 'en' ? 'custom' : 'カスタム'}`,
    );
    if (!name?.trim()) return;
    const entry: UserPreset = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      document: cloneDocument(currentDocument),
    };
    const next = [entry, ...userPresets].slice(0, 40);
    setUserPresets(next);
    try {
      window.localStorage.setItem('userPresets', JSON.stringify(next));
    } catch {
      /* Keep the preset in memory. */
    }
    editor.replace(currentDocument, {
      presetId: entry.id,
      presetName: entry.name,
      activeLayerId,
    });
    flash(
      locale === 'en' ? 'Saved to My Presets.' : 'マイプリセットに保存しました',
    );
  }

  function randomizeAll() {
    const seed = freshSeed();
    const generated = generateOmakase(seed, randomCategory);
    const nextDocument = mergeLockedRandomChannels(
      currentDocument,
      generated.document,
      randomLocks,
    );
    editor.replace(nextDocument, {
      presetId: generated.preset.id,
      presetName: `${generated.preset.name} · ${locale === 'en' ? 'generated' : 'おまかせ'}`,
      activeLayerId: nextDocument.layers[0]?.id ?? null,
      generation: generated.generation,
    });
    const recent = [
      {
        document: cloneDocument(nextDocument),
        generation: generated.generation,
      },
      ...recentRandom,
    ].slice(0, 10);
    setRecentRandom(recent);
    try {
      window.localStorage.setItem('recentRandom', JSON.stringify(recent));
    } catch {
      /* Keep in memory if quota is small. */
    }
    flash(
      locale === 'en' ? 'Generated a new pattern.' : '新しい模様を生成しました',
    );
  }

  function loadRandomHistory(entry: RandomHistoryEntry, index: number) {
    editor.replace(cloneDocument(entry.document), {
      presetId: `random-history-${index}`,
      presetName: `${locale === 'en' ? 'Generation history' : 'おまかせ履歴'} ${index + 1}`,
      activeLayerId: entry.document.layers[0]?.id ?? null,
      ...(entry.generation ? { generation: entry.generation } : {}),
    });
    flash(
      locale === 'en'
        ? 'Restored generation history.'
        : 'おまかせ履歴を復元しました',
    );
  }

  function regenerateOmakaseFromSeed() {
    const category = editor.generation?.category ?? randomCategory;
    const generated = generateOmakase(
      currentDocument.seed,
      category,
      editor.generation?.algorithmVersion ?? 2,
    );
    editor.replace(generated.document, {
      presetId: generated.preset.id,
      presetName: `${generated.preset.name} · ${locale === 'en' ? 'Seed replay' : 'Seed再現'}`,
      activeLayerId: generated.document.layers[0]?.id ?? null,
      generation: generated.generation,
    });
    flash(
      locale === 'en'
        ? 'Replayed the full pattern from this Seed and category.'
        : 'このSeedとカテゴリーで模様全体を再現しました',
    );
  }

  function randomizeColors() {
    if (randomLocks.palette) {
      flash(locale === 'en' ? 'Color is locked.' : '色が固定されています');
      return;
    }
    const seed = freshSeed();
    const selected =
      PALETTE_OPTIONS[
        Math.floor(seededUnit(seed, 0, 30) * PALETTE_OPTIONS.length)
      ];
    editor.commit((document) => ({
      ...document,
      seed,
      canvas: { ...document.canvas, background: selected.colors[0] },
      palette: selected.colors.slice(1),
    }));
    flash(locale === 'en' ? 'Randomized colors.' : '配色を入れ替えました');
  }

  function applyColorMode(mode: (typeof AUTO_COLOR_MODES)[number][0]) {
    const seed = freshSeed();
    const palette = colorScheme(mode, seed);
    editor.commit((document) => ({ ...document, seed, palette }));
  }

  function randomizePlacement() {
    if (randomLocks.placement) {
      flash(locale === 'en' ? 'Layout is locked.' : '配置が固定されています');
      return;
    }
    const seed = freshSeed();
    editor.commit((document) => ({
      ...document,
      seed,
      layers: document.layers.map((layer, index) => {
        if (layer.type === 'lowPoly' || layer.type === 'glassShards') {
          return {
            ...layer,
            rotation: Math.round(seededUnit(seed, index, 41) * 360 - 180),
          };
        }
        if (layer.type === 'quarterTiles') {
          return {
            ...layer,
            rotation: Math.floor(seededUnit(seed, index, 42) * 4) * 90,
            config: {
              ...layer.config,
              jitterRotation: seededUnit(seed, index, 43) > 0.5 ? 100 : 0,
            },
          };
        }
        return {
          ...layer,
          config: {
            ...layer.config,
            placement:
              PLACEMENT_TYPES[
                Math.floor(seededUnit(seed, index, 40) * PLACEMENT_TYPES.length)
              ],
          },
        };
      }),
    }));
    flash(locale === 'en' ? 'Randomized layout.' : '配置を入れ替えました');
  }

  async function copyShareUrl() {
    try {
      const url = new URL(window.location.href);
      url.search = '';
      url.searchParams.set('state', encodeShareState(editor.snapshot));
      await navigator.clipboard.writeText(url.toString());
      flash(
        locale === 'en'
          ? 'Copied a reproducible URL. Only allowed viewers can open it.'
          : '再現URLをコピーしました（アクセス権のある相手のみ開けます）',
      );
    } catch {
      flash(
        locale === 'en'
          ? 'Could not copy the URL.'
          : 'URLのコピーに失敗しました',
      );
    }
  }

  async function copySeed() {
    await navigator.clipboard?.writeText(String(currentDocument.seed));
    const categoryLabel =
      OMAKASE_CATEGORIES.find(([value]) => value === randomCategory)?.[1] ??
      randomCategory;
    flash(
      locale === 'en'
        ? `Copied Seed (category: ${OMAKASE_LABELS_EN[randomCategory] ?? randomCategory}).`
        : `Seedをコピーしました（カテゴリー: ${categoryLabel}）`,
    );
  }

  function applyPurpose(id: string) {
    const purpose = purposePreset(id);
    if (!purpose) return;
    setPurposeId(id);
    editor.patchCanvas({
      width: purpose.width,
      height: purpose.height,
      seamless: purpose.seamless,
      transparent: purpose.transparent,
      tileSize: purpose.tileSize,
    });
    flash(
      locale === 'en'
        ? `Applied ${purpose.labelEn}.`
        : `${purpose.label}を適用しました`,
    );
  }

  function applyPalette(background: string, colors: string[]) {
    editor.commit((document) => ({
      ...document,
      canvas: { ...document.canvas, background },
      palette: colors.slice(0, 8),
    }));
  }

  function loadSnapshot(snapshot: EditorSnapshot, name: string) {
    editor.replace(snapshot.document, {
      presetId: snapshot.presetId,
      presetName: name,
      activeLayerId: snapshot.activeLayerId,
      ...(snapshot.generation ? { generation: snapshot.generation } : {}),
    });
    flash(locale === 'en' ? `Loaded ${name}.` : `${name}を読み込みました`);
  }

  function updateDisplay(patch: Partial<DisplayPreferences>) {
    if (patch.mode) {
      setEditorMode(patch.mode);
      if (
        patch.mode === 'simple' &&
        !['pattern', 'color', 'canvas', 'presets'].includes(tab)
      )
        setTab('pattern');
    }
    if (patch.locale) setLocale(patch.locale);
    if (patch.textSize) setTextSize(patch.textSize);
    if (typeof patch.darkMode === 'boolean') setDarkMode(patch.darkMode);
    if (typeof patch.showSafeArea === 'boolean')
      setShowSafeArea(patch.showSafeArea);
  }

  if (!activeLayer) return null;
  const lineLike = LINE_PATTERN_TYPES.has(activeLayer.type);
  const previewStage = (
    <section
      id="pattern-preview"
      tabIndex={-1}
      aria-label={locale === 'en' ? 'Pattern preview' : '模様プレビュー'}
      className="preview-stage relative min-h-0 overflow-hidden bg-muted/45 p-3 sm:p-6"
    >
      <div className="absolute inset-0 checker opacity-45" aria-hidden="true" />
      <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-border/70 bg-card/90 p-1 shadow-sm backdrop-blur-md sm:top-4">
        <Button
          size="xs"
          variant={!effectiveTilePreview ? 'secondary' : 'ghost'}
          aria-pressed={!effectiveTilePreview}
          onClick={() => setTilePreview(false)}
        >
          {locale === 'en' ? 'Canvas' : '通常'}
        </Button>
        <Button
          size="xs"
          variant={effectiveTilePreview ? 'secondary' : 'ghost'}
          aria-pressed={effectiveTilePreview}
          disabled={!currentDocument.canvas.seamless}
          title={
            !currentDocument.canvas.seamless
              ? locale === 'en'
                ? 'Enable seamless mode for the 3×3 preview'
                : '3×3表示にはシームレスを有効にしてください'
              : undefined
          }
          onClick={() => setTilePreview(true)}
        >
          {locale === 'en' ? '3×3 tiles' : '3×3 タイル'}
        </Button>
        <span className="mx-1 h-4 w-px bg-border" />
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={locale === 'en' ? 'Zoom out' : '縮小'}
          onClick={() => setZoom((value) => Math.max(0.45, value - 0.1))}
        >
          <ZoomOut />
        </Button>
        <span className="min-w-9 text-center text-[10px] tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={locale === 'en' ? 'Zoom in' : '拡大'}
          onClick={() => setZoom((value) => Math.min(2, value + 0.1))}
        >
          <ZoomIn />
        </Button>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={locale === 'en' ? 'Fit preview' : '全体表示'}
          onClick={() => setZoom(1)}
        >
          <Maximize />
        </Button>
      </div>
      <div className="relative mx-auto flex h-full max-w-[1120px] items-center justify-center overflow-auto pt-8">
        <div
          className="canvas-wrap relative max-h-full w-full overflow-hidden rounded-[18px] bg-white shadow-[0_22px_70px_rgb(15_23_42/16%)] ring-1 ring-black/8 transition-transform"
          style={{
            aspectRatio: effectiveTilePreview
              ? `${repeatPlan.width} / ${repeatPlan.height}`
              : `${currentDocument.canvas.width} / ${currentDocument.canvas.height}`,
            transform: `scale(${zoom})`,
          }}
        >
          <PatternCanvas
            id="pattern-canvas"
            document={currentDocument}
            tilePreview={effectiveTilePreview}
            maxObjects={2400}
            className="h-full w-full"
            label={t(locale, 'generated')}
            description={patternDescription}
          />
          {showSafeArea &&
            selectedPurpose?.safeArea &&
            !effectiveTilePreview && (
              <SafeAreaOverlay
                inset={selectedPurpose.safeArea}
                label={t(locale, 'safeArea')}
              />
            )}
          <div
            data-export-ignore="true"
            className="absolute bottom-3 left-3 z-[4] rounded-md bg-black/65 px-2 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm"
          >
            {effectiveTilePreview
              ? `${repeatPlan.width} × ${repeatPlan.height}px · 3×3`
              : `${currentDocument.canvas.width} × ${currentDocument.canvas.height}`}{' '}
            ·{' '}
            {currentDocument.canvas.seamless
              ? locale === 'en'
                ? 'seamless'
                : 'シームレス'
              : locale === 'en'
                ? 'standard'
                : '通常'}
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <div className={darkMode ? 'dark' : ''} data-text-size={textSize}>
      <nav
        className="skip-links"
        aria-label={locale === 'en' ? 'Skip links' : 'ページ内リンク'}
      >
        <a href="#main-content">{t(locale, 'skipMain')}</a>
        <a href="#pattern-preview">{t(locale, 'skipPreview')}</a>
        <a href="#editor-controls">{t(locale, 'skipControls')}</a>
        <a href="#preset-browser">{t(locale, 'skipPresets')}</a>
        <a href="#quick-actions">{t(locale, 'skipQuick')}</a>
      </nav>
      <main
        id="main-content"
        tabIndex={-1}
        className="flex h-dvh min-h-[680px] flex-col overflow-hidden bg-background text-foreground"
      >
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-card px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <span className="text-[10px] font-black tracking-[-.12em]">
                KM
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold tracking-[.12em]">
                KIKAMOYO
              </h1>
              <p className="ui-help hidden text-muted-foreground sm:block">
                {locale === 'en'
                  ? 'Geometric patterns in seconds.'
                  : '幾何学模様を、3秒で。'}
              </p>
            </div>
          </div>
          <div className="header-actions flex min-w-0 items-center gap-1 overflow-x-auto">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={locale === 'en' ? 'Undo' : '元に戻す'}
              disabled={!editor.canUndo}
              onClick={editor.undo}
            >
              <Undo2 />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={locale === 'en' ? 'Redo' : 'やり直す'}
              disabled={!editor.canRedo}
              onClick={editor.redo}
            >
              <Redo2 />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={
                locale === 'en' ? 'Save as preset' : '設定をプリセット保存'
              }
              onClick={saveUserPreset}
            >
              <Save />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={
                locale === 'en' ? 'Share reproducible URL' : '再現URLを共有'
              }
              onClick={copyShareUrl}
            >
              <Share2 />
            </Button>
            <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
            <ProjectManagerDialog
              snapshot={editor.snapshot}
              locale={locale}
              onLoad={loadSnapshot}
              onNotice={flash}
            />
            <DisplaySettingsDialog
              value={displayPreferences}
              onChange={updateDisplay}
            />
            <ExportDialog
              document={currentDocument}
              name={activePresetName}
              locale={locale}
            />
          </div>
        </header>

        <div className="editor-grid min-h-0 flex-1">
          {isMobileLayout && previewStage}
          <aside
            id="editor-controls"
            tabIndex={-1}
            aria-label={locale === 'en' ? 'Editor controls' : '編集設定'}
            className="left-panel min-h-0 overflow-y-auto border-r border-border bg-card"
          >
            <div className="sticky top-0 z-30 grid grid-cols-2 gap-1 border-b border-border bg-card p-2">
              <Button
                size="sm"
                variant={editorMode === 'simple' ? 'secondary' : 'ghost'}
                aria-pressed={editorMode === 'simple'}
                onClick={() => setEditorMode('simple')}
              >
                {t(locale, 'simple')}
              </Button>
              <Button
                size="sm"
                variant={editorMode === 'detail' ? 'secondary' : 'ghost'}
                aria-pressed={editorMode === 'detail'}
                onClick={() => setEditorMode('detail')}
              >
                {t(locale, 'detail')}
              </Button>
            </div>
            {editorMode === 'simple' ? (
              <SimpleEditorPanel
                document={currentDocument}
                activeLayer={activeLayer}
                locale={locale}
                purposeId={purposeId}
                showSafeArea={showSafeArea}
                locks={randomLocks}
                onApplyStyle={applyPatternType}
                onPatchLayer={(patch) => {
                  const { opacity, ...config } = patch;
                  editor.commit((document) => ({
                    ...document,
                    layers: document.layers.map((layer) =>
                      layer.id === activeLayer.id
                        ? {
                            ...layer,
                            ...(opacity === undefined ? {} : { opacity }),
                            config: { ...layer.config, ...config },
                          }
                        : layer,
                    ),
                  }));
                }}
                onPatchCanvas={editor.patchCanvas}
                onApplyPalette={applyPalette}
                onPurpose={applyPurpose}
                onSafeArea={setShowSafeArea}
                onLocks={setRandomLocks}
              />
            ) : (
              <Tabs
                value={effectiveTab}
                onValueChange={setTab}
                className="min-h-full gap-0"
              >
                <TabsList
                  variant="line"
                  className="editor-tabs-list sticky top-[49px] z-20 grid min-h-[76px] w-full grid-cols-3 border-b border-border bg-card px-2 py-1"
                >
                  <TabsTrigger
                    value="pattern"
                    aria-label={t(locale, 'pattern')}
                  >
                    <Grid2X2 />
                    <span>{t(locale, 'pattern')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="color" aria-label={t(locale, 'color')}>
                    <Palette />
                    <span>{t(locale, 'color')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="rough" aria-label={t(locale, 'rough')}>
                    <SlidersHorizontal />
                    <span>{t(locale, 'rough')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="layers" aria-label={t(locale, 'layers')}>
                    <Layers3 />
                    <span>{t(locale, 'layers')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="canvas" aria-label={t(locale, 'canvas')}>
                    <Frame />
                    <span>{t(locale, 'canvas')}</span>
                  </TabsTrigger>
                  {!wideLayout && (
                    <TabsTrigger
                      value="presets"
                      aria-label={t(locale, 'presets')}
                    >
                      <WandSparkles />
                      <span>{t(locale, 'presets')}</span>
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="pattern" className="space-y-6 p-4">
                  <section className="space-y-3">
                    <div>
                      <h2 className="section-label">
                        {locale === 'en' ? 'Choose a look' : '見た目を選ぶ'}
                      </h2>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {locale === 'en'
                          ? 'Choose a style, then fine-tune it with the controls below.'
                          : 'スタイルを選んでから、下のつまみで細かく調整できます。'}
                      </p>
                    </div>
                    <div
                      role="radiogroup"
                      aria-label={
                        locale === 'en' ? 'Pattern style' : '模様のスタイル'
                      }
                      className="grid grid-cols-2 gap-2"
                    >
                      {VISUAL_STYLES.map((style) => {
                        const selected = activeVisualStyle === style.value;
                        return (
                          <label
                            key={style.value}
                            className={`relative min-h-24 cursor-pointer overflow-hidden rounded-xl border bg-background text-left transition focus-within:ring-2 focus-within:ring-ring ${selected ? 'border-primary ring-2 ring-primary/15' : 'border-input hover:border-primary/55'}`}
                          >
                            <input
                              type="radio"
                              name="visual-style"
                              value={style.value}
                              checked={selected}
                              aria-label={
                                locale === 'en'
                                  ? `Select ${style.labelEn} style`
                                  : `${style.label}スタイルを選択`
                              }
                              onChange={() => applyVisualStyle(style.value)}
                              onKeyDown={(event) => {
                                if (
                                  event.key === ' ' ||
                                  event.key === 'Enter'
                                ) {
                                  event.preventDefault();
                                  applyVisualStyle(style.value);
                                }
                              }}
                              className="absolute inset-0 z-20 m-0 h-full w-full cursor-pointer opacity-0"
                            />
                            <span
                              aria-hidden="true"
                              className="block h-12 overflow-hidden bg-muted"
                            >
                              <PatternCanvas
                                decorative
                                document={style.sample}
                                maxObjects={48}
                                className="h-full w-full"
                              />
                            </span>
                            <span className="block px-2 py-1.5">
                              <strong className="block text-[11px]">
                                {locale === 'en' ? style.labelEn : style.label}
                              </strong>
                              <span className="block truncate text-[9px] text-muted-foreground">
                                {locale === 'en'
                                  ? style.descriptionEn
                                  : style.description}
                              </span>
                            </span>
                            {selected && (
                              <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                                <Check className="size-3" />
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </section>
                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="section-label">
                        {locale === 'en' ? 'Details' : '詳細'}
                      </h2>
                      <span className="max-w-32 truncate rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                        {activeLayer.name}
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium">
                          {locale === 'en' ? 'Shape' : '図形'}
                        </span>
                        <Select
                          value={activeLayer.type}
                          onValueChange={(value) =>
                            value && applyPatternType(value as PatternType)
                          }
                        >
                          <SelectTrigger
                            className="w-full"
                            aria-label={locale === 'en' ? 'Shape' : '図形'}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PATTERN_TYPES.map((value) => (
                              <SelectItem key={value} value={value}>
                                {locale === 'en'
                                  ? PATTERN_LABELS_EN[value]
                                  : PATTERN_LABELS[value]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {surfaceStyle ? (
                        <div className="rounded-lg border border-border bg-muted/35 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
                          {locale === 'en'
                            ? 'This style is generated directly across the canvas from its Seed.'
                            : 'このスタイルは、キャンバス全体をSeedから直接生成します。'}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <span className="text-xs font-medium">
                            {locale === 'en' ? 'Layout' : '配置'}
                          </span>
                          <Select
                            value={activeLayer.config.placement}
                            onValueChange={(value) =>
                              value &&
                              editor.patchLayerConfig(activeLayer.id, {
                                placement:
                                  value as typeof activeLayer.config.placement,
                              })
                            }
                          >
                            <SelectTrigger
                              className="w-full"
                              aria-label={locale === 'en' ? 'Layout' : '配置'}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PLACEMENT_TYPES.map((value) => (
                                <SelectItem key={value} value={value}>
                                  {locale === 'en'
                                    ? PLACEMENT_LABELS_EN[value]
                                    : PLACEMENT_LABELS[value]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </section>
                  <section className="space-y-5">
                    <h2 className="section-label">
                      {locale === 'en' ? 'Geometry' : 'かたち'}
                    </h2>
                    <RangeControl
                      label={
                        locale === 'en'
                          ? 'Size'
                          : activeVisualStyle === 'lowPoly'
                            ? '面の大きさ'
                            : activeVisualStyle === 'glassShards'
                              ? '線の長さ'
                              : activeVisualStyle === 'quarterTiles'
                                ? 'カーブの大きさ'
                                : lineLike
                                  ? 'モチーフサイズ'
                                  : 'サイズ'
                      }
                      value={activeLayer.config.size}
                      min={4}
                      max={140}
                      unit="px"
                      onChange={(size) =>
                        editor.patchLayerConfig(activeLayer.id, { size })
                      }
                    />
                    <RangeControl
                      label={
                        locale === 'en'
                          ? 'Density'
                          : activeVisualStyle === 'lowPoly'
                            ? '面の細かさ'
                            : activeVisualStyle === 'glassShards'
                              ? '線の本数'
                              : activeVisualStyle === 'quarterTiles'
                                ? 'タイル密度'
                                : activeVisualStyle === 'geoCollage'
                                  ? 'モチーフ密度'
                                  : '密度'
                      }
                      value={activeLayer.config.density}
                      min={10}
                      max={100}
                      unit="%"
                      onChange={(density) =>
                        editor.patchLayerConfig(activeLayer.id, { density })
                      }
                    />
                    <RangeControl
                      label={
                        locale === 'en'
                          ? 'Spacing'
                          : activeVisualStyle === 'glassShards'
                            ? '線の太さ'
                            : activeVisualStyle === 'quarterTiles'
                              ? 'セル間隔'
                              : '間隔'
                      }
                      value={activeLayer.config.gap}
                      min={8}
                      max={160}
                      unit="px"
                      onChange={(gap) =>
                        editor.patchLayerConfig(activeLayer.id, { gap })
                      }
                    />
                    <RangeControl
                      label={
                        locale === 'en'
                          ? 'Rotation'
                          : activeVisualStyle === 'lowPoly' ||
                              activeVisualStyle === 'glassShards'
                            ? '流れの角度'
                            : '回転'
                      }
                      value={activeLayer.rotation}
                      min={-180}
                      max={180}
                      unit="°"
                      onChange={(rotation) =>
                        editor.patchLayer(activeLayer.id, { rotation })
                      }
                    />
                    {proceduralStyle && (
                      <RangeControl
                        label={
                          locale === 'en' ? 'Layer opacity' : 'レイヤーの濃さ'
                        }
                        value={Math.round(activeLayer.opacity * 100)}
                        min={10}
                        max={100}
                        unit="%"
                        onChange={(opacity) =>
                          editor.patchLayer(activeLayer.id, {
                            opacity: opacity / 100,
                          })
                        }
                      />
                    )}
                    {lineLike ? (
                      <RangeControl
                        label={locale === 'en' ? 'Stroke width' : '線幅'}
                        value={activeLayer.config.strokeWidth}
                        min={0.5}
                        max={14}
                        step={0.5}
                        unit="px"
                        onChange={(strokeWidth) =>
                          editor.patchLayerConfig(activeLayer.id, {
                            strokeWidth,
                          })
                        }
                      />
                    ) : (
                      ['squares', 'rectangles'].includes(activeLayer.type) && (
                        <RangeControl
                          label={locale === 'en' ? 'Corner radius' : '角丸'}
                          value={activeLayer.config.cornerRadius}
                          min={0}
                          max={30}
                          unit="px"
                          onChange={(cornerRadius) =>
                            editor.patchLayerConfig(activeLayer.id, {
                              cornerRadius,
                            })
                          }
                        />
                      )
                    )}
                    {!lineLike && !proceduralStyle && (
                      <div className="space-y-2">
                        <span className="text-xs font-medium">
                          {locale === 'en' ? 'Rendering' : '描画'}
                        </span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(
                            [
                              ['fill', locale === 'en' ? 'Fill' : '塗り'],
                              ['stroke', locale === 'en' ? 'Stroke' : '線のみ'],
                              ['both', locale === 'en' ? 'Both' : '塗り＋線'],
                            ] as const
                          ).map(([value, label]) => (
                            <Button
                              key={value}
                              size="sm"
                              variant={
                                activeLayer.config.fillMode === value
                                  ? 'secondary'
                                  : 'outline'
                              }
                              aria-pressed={
                                activeLayer.config.fillMode === value
                              }
                              onClick={() =>
                                editor.patchLayerConfig(activeLayer.id, {
                                  fillMode: value,
                                })
                              }
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    {['ellipse', 'rectangles'].includes(activeLayer.type) && (
                      <>
                        <RangeControl
                          label={
                            locale === 'en' ? 'Horizontal size' : '横サイズ'
                          }
                          value={Math.round(activeLayer.config.aspectX * 100)}
                          min={30}
                          max={220}
                          unit="%"
                          onChange={(aspectX) =>
                            editor.patchLayerConfig(activeLayer.id, {
                              aspectX: aspectX / 100,
                            })
                          }
                        />
                        <RangeControl
                          label={locale === 'en' ? 'Vertical size' : '縦サイズ'}
                          value={Math.round(activeLayer.config.aspectY * 100)}
                          min={30}
                          max={220}
                          unit="%"
                          onChange={(aspectY) =>
                            editor.patchLayerConfig(activeLayer.id, {
                              aspectY: aspectY / 100,
                            })
                          }
                        />
                      </>
                    )}
                  </section>
                </TabsContent>

                <TabsContent value="color" className="space-y-6 p-4">
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="section-label">
                        {locale === 'en' ? 'Background' : '背景'}
                      </h2>
                      <span className="text-[10px] text-muted-foreground">
                        {locale === 'en' ? 'Up to 8 colors' : '最大8色'}
                      </span>
                    </div>
                    <div className="grid grid-cols-[42px_1fr] gap-2">
                      <input
                        aria-label={
                          locale === 'en' ? 'Background color' : '背景色'
                        }
                        type="color"
                        value={currentDocument.canvas.background}
                        onChange={(event) =>
                          editor.patchCanvas({ background: event.target.value })
                        }
                        className="h-9 w-10 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                      />
                      <HexInput
                        label={
                          locale === 'en'
                            ? 'Background HEX value'
                            : '背景色のHEX値'
                        }
                        value={currentDocument.canvas.background}
                        onCommit={(background) =>
                          editor.patchCanvas({ background })
                        }
                      />
                    </div>
                  </section>
                  <section className="space-y-3">
                    <h2 className="section-label">
                      {locale === 'en' ? 'Curated palettes' : '定番パレット'}
                    </h2>
                    <div className="grid grid-cols-2 gap-2">
                      {PALETTE_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className="rounded-lg border border-border bg-background p-2 text-left transition hover:border-primary/45"
                          onClick={() =>
                            editor.commit((document) => ({
                              ...document,
                              canvas: {
                                ...document.canvas,
                                background: option.colors[0],
                              },
                              palette: option.colors.slice(1),
                            }))
                          }
                        >
                          <span className="mb-1.5 block truncate text-[10px] font-semibold">
                            {locale === 'en'
                              ? option.id.replace(/([A-Z])/g, ' $1')
                              : (PALETTE_LABELS[option.id] ?? option.id)}
                          </span>
                          <span className="flex overflow-hidden rounded-full">
                            {option.colors.map((color) => (
                              <span
                                key={color}
                                className="h-2.5 flex-1"
                                style={{ background: color }}
                              />
                            ))}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                  <section className="space-y-2">
                    <h2 className="section-label">
                      {locale === 'en' ? 'Palette' : 'パレット'}
                    </h2>
                    {currentDocument.palette.map((color, index) => (
                      <div
                        key={`${index}-${color}`}
                        className="grid grid-cols-[34px_1fr_28px] items-center gap-2"
                      >
                        <input
                          aria-label={
                            locale === 'en'
                              ? `Color ${index + 1}`
                              : `カラー${index + 1}`
                          }
                          type="color"
                          value={color}
                          onChange={(event) =>
                            editor.commit((document) => ({
                              ...document,
                              palette: document.palette.map(
                                (value, colorIndex) =>
                                  colorIndex === index
                                    ? event.target.value
                                    : value,
                              ),
                            }))
                          }
                          className="size-8 cursor-pointer rounded-md border border-border bg-transparent p-1"
                        />
                        <HexInput
                          label={
                            locale === 'en'
                              ? `Color ${index + 1} HEX value`
                              : `カラー${index + 1}のHEX値`
                          }
                          value={color}
                          onCommit={(nextColor) =>
                            editor.commit((document) => ({
                              ...document,
                              palette: document.palette.map(
                                (value, colorIndex) =>
                                  colorIndex === index ? nextColor : value,
                              ),
                            }))
                          }
                        />
                        <span className="text-center text-[10px] text-muted-foreground">
                          {index + 1}
                        </span>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={currentDocument.palette.length >= 8}
                        onClick={() =>
                          editor.commit((document) => ({
                            ...document,
                            palette: [...document.palette, '#ffffff'].slice(
                              0,
                              8,
                            ),
                          }))
                        }
                      >
                        <Plus />
                        {locale === 'en' ? 'Add color' : '色を追加'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={currentDocument.palette.length <= 1}
                        onClick={() =>
                          editor.commit((document) => ({
                            ...document,
                            palette: document.palette.slice(0, -1),
                          }))
                        }
                      >
                        {locale === 'en' ? 'Remove last' : '最後を削除'}
                      </Button>
                    </div>
                  </section>
                  <section className="space-y-3">
                    <h2 className="section-label">
                      {locale === 'en' ? 'Generate palette' : '自動配色'}
                    </h2>
                    <div className="grid grid-cols-2 gap-2">
                      {AUTO_COLOR_MODES.map(([value, label]) => (
                        <Button
                          key={value}
                          size="sm"
                          variant="outline"
                          onClick={() => applyColorMode(value)}
                        >
                          {locale === 'en'
                            ? AUTO_COLOR_LABELS_EN[value]
                            : label}
                        </Button>
                      ))}
                    </div>
                  </section>
                  <BrandPaletteDialog
                    document={currentDocument}
                    locale={locale}
                    onApply={applyPalette}
                  />
                </TabsContent>

                <TabsContent value="rough" className="space-y-6 p-4">
                  <div>
                    <h2 className="section-label">
                      {locale === 'en' ? 'Variation' : '崩し具合'}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {locale === 'en'
                        ? 'The same Seed reproduces the same variation after editing.'
                        : '同じSeedなら、調整後も同じ揺らぎを再現できます。'}
                    </p>
                  </div>
                  <RangeControl
                    label={locale === 'en' ? 'Overall variation' : '全体の崩し'}
                    value={activeLayer.config.roughness}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={(roughness) =>
                      editor.patchLayerConfig(activeLayer.id, { roughness })
                    }
                  />
                  <div className="h-px bg-border" />
                  <RangeControl
                    label={
                      locale === 'en' ? 'Position variation' : '位置ランダム'
                    }
                    value={activeLayer.config.jitterPosition}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={(jitterPosition) =>
                      editor.patchLayerConfig(activeLayer.id, {
                        jitterPosition,
                      })
                    }
                  />
                  <RangeControl
                    label={
                      locale === 'en' ? 'Rotation variation' : '回転ランダム'
                    }
                    value={activeLayer.config.jitterRotation}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={(jitterRotation) =>
                      editor.patchLayerConfig(activeLayer.id, {
                        jitterRotation,
                      })
                    }
                  />
                  <RangeControl
                    label={
                      locale === 'en' ? 'Size variation' : 'サイズランダム'
                    }
                    value={activeLayer.config.jitterSize}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={(jitterSize) =>
                      editor.patchLayerConfig(activeLayer.id, { jitterSize })
                    }
                  />
                  <RangeControl
                    label={locale === 'en' ? 'Color variation' : '色ランダム'}
                    value={activeLayer.config.jitterColor}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={(jitterColor) =>
                      editor.patchLayerConfig(activeLayer.id, { jitterColor })
                    }
                  />
                  <RangeControl
                    label={
                      locale === 'en' ? 'Opacity variation' : '透明度ランダム'
                    }
                    value={activeLayer.config.jitterOpacity}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={(jitterOpacity) =>
                      editor.patchLayerConfig(activeLayer.id, { jitterOpacity })
                    }
                  />
                  <RandomLockControls
                    value={randomLocks}
                    locale={locale}
                    onChange={setRandomLocks}
                  />
                </TabsContent>

                <TabsContent value="layers" className="space-y-4 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="section-label">
                        {locale === 'en' ? 'Layers' : 'レイヤー'}
                      </h2>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {currentDocument.layers.length} / 5
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentDocument.layers.length >= 5}
                      onClick={() => editor.addLayer(activeLayer)}
                    >
                      <Plus />
                      {locale === 'en' ? 'Add' : '追加'}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {[...currentDocument.layers].reverse().map((layer) => (
                      <div
                        key={layer.id}
                        className={`flex items-center gap-2 rounded-xl border p-2 ${activeLayer.id === layer.id ? 'border-primary bg-accent/45' : 'border-border bg-background'}`}
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          aria-pressed={activeLayer.id === layer.id}
                          onClick={() => editor.setActiveLayerId(layer.id)}
                        >
                          <strong className="block truncate text-xs">
                            {layer.name}
                          </strong>
                          <span className="text-[9px] text-muted-foreground">
                            {locale === 'en'
                              ? PATTERN_LABELS_EN[layer.type]
                              : PATTERN_LABELS[layer.type]}{' '}
                            ·{' '}
                            {[
                              'lowPoly',
                              'glassShards',
                              'quarterTiles',
                            ].includes(layer.type)
                              ? locale === 'en'
                                ? 'Generated surface'
                                : '面生成'
                              : locale === 'en'
                                ? PLACEMENT_LABELS_EN[layer.config.placement]
                                : PLACEMENT_LABELS[layer.config.placement]}
                          </span>
                        </button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label={
                            locale === 'en'
                              ? `${layer.visible ? 'Hide' : 'Show'} ${layer.name}`
                              : `${layer.name}を${layer.visible ? '非表示' : '表示'}`
                          }
                          onClick={() =>
                            editor.patchLayer(layer.id, {
                              visible: !layer.visible,
                            })
                          }
                        >
                          {layer.visible ? <Eye /> : <EyeOff />}
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={
                        locale === 'en'
                          ? `Duplicate ${activeLayer.name}`
                          : `${activeLayer.name}を複製`
                      }
                      disabled={currentDocument.layers.length >= 5}
                      onClick={() => editor.duplicateLayer(activeLayer.id)}
                    >
                      <CopyPlus />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={
                        locale === 'en'
                          ? `Move ${activeLayer.name} up`
                          : `${activeLayer.name}を上へ`
                      }
                      onClick={() => editor.moveLayer(activeLayer.id, 1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={
                        locale === 'en'
                          ? `Move ${activeLayer.name} down`
                          : `${activeLayer.name}を下へ`
                      }
                      onClick={() => editor.moveLayer(activeLayer.id, -1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={
                        locale === 'en'
                          ? `Toggle ${activeLayer.name}`
                          : `${activeLayer.name}の表示を切り替え`
                      }
                      onClick={() =>
                        editor.patchLayer(activeLayer.id, {
                          visible: !activeLayer.visible,
                        })
                      }
                    >
                      {activeLayer.visible ? <Eye /> : <EyeOff />}
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      aria-label={
                        locale === 'en'
                          ? `Delete ${activeLayer.name}`
                          : `${activeLayer.name}を削除`
                      }
                      disabled={currentDocument.layers.length <= 1}
                      onClick={() => editor.removeLayer(activeLayer.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <RangeControl
                    label={locale === 'en' ? 'Opacity' : '透明度'}
                    value={Math.round(activeLayer.opacity * 100)}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={(opacity) =>
                      editor.patchLayer(activeLayer.id, {
                        opacity: opacity / 100,
                      })
                    }
                  />
                  <RangeControl
                    label={locale === 'en' ? 'Scale' : '拡大率'}
                    value={Math.round(activeLayer.scale * 100)}
                    min={20}
                    max={240}
                    unit="%"
                    onChange={(scale) =>
                      editor.patchLayer(activeLayer.id, { scale: scale / 100 })
                    }
                  />
                  <RangeControl
                    label={locale === 'en' ? 'X position' : 'X位置'}
                    value={activeLayer.offsetX}
                    min={-256}
                    max={256}
                    unit="px"
                    onChange={(offsetX) =>
                      editor.patchLayer(activeLayer.id, { offsetX })
                    }
                  />
                  <RangeControl
                    label={locale === 'en' ? 'Y position' : 'Y位置'}
                    value={activeLayer.offsetY}
                    min={-256}
                    max={256}
                    unit="px"
                    onChange={(offsetY) =>
                      editor.patchLayer(activeLayer.id, { offsetY })
                    }
                  />
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium">
                      {locale === 'en' ? 'Blend mode' : '描画モード'}
                    </span>
                    <Select
                      value={activeLayer.blendMode}
                      onValueChange={(value) =>
                        value &&
                        editor.patchLayer(activeLayer.id, {
                          blendMode: value as typeof activeLayer.blendMode,
                        })
                      }
                    >
                      <SelectTrigger
                        className="w-full"
                        aria-label={
                          locale === 'en' ? 'Blend mode' : '描画モード'
                        }
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BLEND_MODES.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>
                            {locale === 'en'
                              ? BLEND_LABELS_EN[mode.value]
                              : mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="canvas" className="space-y-5 p-4">
                  <section className="space-y-2">
                    <h2 className="section-label">
                      {locale === 'en' ? 'Use preset' : '用途プリセット'}
                    </h2>
                    <Select
                      value={purposeId ?? ''}
                      onValueChange={(value) => value && applyPurpose(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            locale === 'en' ? 'Choose a use' : '用途を選ぶ'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {PURPOSE_PRESETS.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {locale === 'en' ? item.labelEn : item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center justify-between rounded-lg border p-3 text-xs">
                      <span>
                        {locale === 'en'
                          ? 'Show safe-area guide'
                          : '安全域ガイドを表示'}
                      </span>
                      <Switch
                        checked={showSafeArea}
                        onCheckedChange={setShowSafeArea}
                      />
                    </div>
                  </section>
                  <section className="space-y-3">
                    <h2 className="section-label">
                      {locale === 'en' ? 'Canvas' : 'キャンバス'}
                    </h2>
                    <Select
                      onValueChange={(value) => {
                        const size = value
                          ? CANVAS_SIZES[Number(value)]
                          : undefined;
                        if (size)
                          editor.patchCanvas({
                            width: size[1],
                            height: size[2],
                          });
                      }}
                    >
                      <SelectTrigger
                        className="w-full"
                        aria-label={
                          locale === 'en' ? 'Canvas size' : 'キャンバスサイズ'
                        }
                      >
                        <SelectValue
                          placeholder={`${currentDocument.canvas.width} × ${currentDocument.canvas.height}`}
                        />
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
                      <DeferredNumberInput
                        label={
                          locale === 'en' ? 'Canvas width' : 'キャンバス幅'
                        }
                        value={currentDocument.canvas.width}
                        min={64}
                        max={8192}
                        onCommit={(width) => editor.patchCanvas({ width })}
                      />
                      <span className="text-muted-foreground">×</span>
                      <DeferredNumberInput
                        label={
                          locale === 'en' ? 'Canvas height' : 'キャンバス高さ'
                        }
                        value={currentDocument.canvas.height}
                        min={64}
                        max={8192}
                        onCommit={(height) => editor.patchCanvas({ height })}
                      />
                    </div>
                  </section>
                  <section className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 text-xs">
                      <span>
                        <strong className="block">
                          {locale === 'en' ? 'Seamless' : 'シームレス'}
                        </strong>
                        <span className="text-[10px] text-muted-foreground">
                          {locale === 'en'
                            ? 'Repeat without visible edges'
                            : '上下左右へ継ぎ目なく反復'}
                        </span>
                      </span>
                      <Switch
                        checked={currentDocument.canvas.seamless}
                        onCheckedChange={(seamless) =>
                          editor.patchCanvas({ seamless })
                        }
                        aria-label={
                          locale === 'en'
                            ? 'Toggle seamless mode'
                            : 'シームレスを切り替え'
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 text-xs">
                      <span>
                        <strong className="block">
                          {locale === 'en'
                            ? 'Transparent background'
                            : '背景を透明にする'}
                        </strong>
                        <span className="text-[10px] text-muted-foreground">
                          {locale === 'en'
                            ? 'For transparent PNG and SVG'
                            : '透過PNG / SVG用'}
                        </span>
                      </span>
                      <Switch
                        checked={currentDocument.canvas.transparent}
                        onCheckedChange={(transparent) =>
                          editor.patchCanvas({ transparent })
                        }
                        aria-label={
                          locale === 'en'
                            ? 'Toggle transparent background'
                            : '背景透過を切り替え'
                        }
                      />
                    </div>
                  </section>
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium">
                      {locale === 'en' ? 'Tile size' : 'タイルサイズ'}
                    </span>
                    <Select
                      value={String(currentDocument.canvas.tileSize)}
                      onValueChange={(value) =>
                        value && editor.patchCanvas({ tileSize: Number(value) })
                      }
                    >
                      <SelectTrigger
                        className="w-full"
                        aria-label={
                          locale === 'en' ? 'Tile size' : 'タイルサイズ'
                        }
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[128, 256, 512, 1024].map((value) => (
                          <SelectItem key={value} value={String(value)}>
                            {value} px
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium">
                      {locale === 'en' ? 'Repeat mode' : 'リピート方式'}
                    </span>
                    <Select
                      value={currentDocument.canvas.repeatMode ?? 'straight'}
                      onValueChange={(value) =>
                        value &&
                        editor.patchCanvas({
                          repeatMode: value as RepeatMode,
                          seamless: true,
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="straight">
                          {locale === 'en' ? 'Straight' : '通常'}
                        </SelectItem>
                        <SelectItem value="halfDrop">
                          {locale === 'en' ? 'Half drop' : 'ハーフドロップ'}
                        </SelectItem>
                        <SelectItem value="mirrorX">
                          {locale === 'en' ? 'Mirror X' : '左右ミラー'}
                        </SelectItem>
                        <SelectItem value="mirrorY">
                          {locale === 'en' ? 'Mirror Y' : '上下ミラー'}
                        </SelectItem>
                        <SelectItem value="mirrorBoth">
                          {locale === 'en' ? 'Mirror both' : '上下左右ミラー'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/35 p-3 text-[10px] leading-relaxed text-muted-foreground">
                    {locale === 'en'
                      ? 'Up to 5,000 objects are drawn. Higher densities are automatically adjusted to a safe spacing.'
                      : '最大描画オブジェクト数は5,000。超過する密度は自動的に安全な間隔へ調整されます。'}
                  </div>
                </TabsContent>

                {!wideLayout && (
                  <TabsContent
                    id="preset-browser"
                    tabIndex={-1}
                    value="presets"
                    className="mobile-preset-content min-h-[420px] p-3"
                  >
                    <PresetBrowser
                      presets={filteredPresets}
                      totalCount={allPresets.length}
                      activeId={activePresetId}
                      favorites={favorites}
                      category={category}
                      search={search}
                      favoriteOnly={favoriteOnly}
                      recentIds={recentIds}
                      recentRandom={recentRandom}
                      onCategory={setCategory}
                      onSearch={setSearch}
                      onFavoriteOnly={() => setFavoriteOnly((value) => !value)}
                      onLoad={loadPreset}
                      onLoadRandom={loadRandomHistory}
                      onFavorite={toggleFavorite}
                      locale={locale}
                    />
                  </TabsContent>
                )}
              </Tabs>
            )}
          </aside>

          {!isMobileLayout && previewStage}

          {wideLayout && (
            <aside
              id="preset-browser"
              tabIndex={-1}
              aria-label={
                locale === 'en' ? 'Preset browser' : 'プリセットブラウザー'
              }
              className="preset-panel min-h-0 overflow-hidden border-l border-border bg-card p-3.5"
            >
              <PresetBrowser
                presets={filteredPresets}
                totalCount={allPresets.length}
                activeId={activePresetId}
                favorites={favorites}
                category={category}
                search={search}
                favoriteOnly={favoriteOnly}
                recentIds={recentIds}
                recentRandom={recentRandom}
                onCategory={setCategory}
                onSearch={setSearch}
                onFavoriteOnly={() => setFavoriteOnly((value) => !value)}
                onLoad={loadPreset}
                onLoadRandom={loadRandomHistory}
                onFavorite={toggleFavorite}
                locale={locale}
              />
            </aside>
          )}
        </div>

        <footer
          id="quick-actions"
          tabIndex={-1}
          aria-label={
            locale === 'en' ? 'Quick generation actions' : '生成クイック操作'
          }
          className="editor-footer grid shrink-0 gap-2 border-t border-border bg-card px-2 py-2 sm:flex sm:h-14 sm:flex-nowrap sm:items-center sm:px-4 sm:py-0"
        >
          <div className="footer-generate grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-1.5 sm:flex sm:flex-none">
            <select
              aria-label={
                locale === 'en'
                  ? 'Generation category'
                  : 'おまかせ生成カテゴリー'
              }
              value={randomCategory}
              onChange={(event) => setRandomCategory(event.target.value)}
              className="h-10 min-w-0 rounded-lg border border-input bg-background px-2 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:max-w-28"
            >
              {OMAKASE_CATEGORIES.map(([value, label], index) => (
                <option key={`${value}-${index}`} value={value}>
                  {locale === 'en'
                    ? (OMAKASE_LABELS_EN[value] ?? value)
                    : label}
                </option>
              ))}
            </select>
            <Button
              className="h-10 shrink-0 bg-[#ad352f] text-white hover:bg-[#922b27] sm:h-8"
              onClick={randomizeAll}
            >
              <Sparkles data-icon="inline-start" />
              {locale === 'en' ? 'Generate' : 'おまかせ生成'}
            </Button>
            <Button
              className="mobile-touch"
              size="icon"
              variant="outline"
              aria-label={
                locale === 'en' ? 'Randomize colors only' : '色だけランダム'
              }
              onClick={randomizeColors}
            >
              <Palette />
            </Button>
            <Button
              className="mobile-touch"
              size="icon"
              variant="outline"
              aria-label={
                locale === 'en' ? 'Randomize layout only' : '配置だけランダム'
              }
              onClick={randomizePlacement}
            >
              <Shuffle />
            </Button>
          </div>
          <div className="footer-secondary flex min-w-0 items-center gap-1.5 sm:contents">
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                className="mobile-touch"
                size="icon"
                variant="outline"
                aria-label={locale === 'en' ? 'Flip horizontally' : '左右反転'}
                aria-pressed={currentDocument.canvas.flipX}
                onClick={() =>
                  editor.patchCanvas({ flipX: !currentDocument.canvas.flipX })
                }
              >
                <FlipHorizontal2 />
              </Button>
              <Button
                className="mobile-touch"
                size="icon"
                variant="outline"
                aria-label={locale === 'en' ? 'Flip vertically' : '上下反転'}
                aria-pressed={currentDocument.canvas.flipY}
                onClick={() =>
                  editor.patchCanvas({ flipY: !currentDocument.canvas.flipY })
                }
              >
                <FlipVertical2 />
              </Button>
              <Button
                className="mobile-touch"
                size="icon"
                variant="outline"
                aria-label={locale === 'en' ? 'Rotate 90 degrees' : '90度回転'}
                onClick={() =>
                  editor.commit((document) => ({
                    ...document,
                    layers: document.layers.map((layer) => ({
                      ...layer,
                      rotation: layer.rotation + 90,
                    })),
                  }))
                }
              >
                <RotateCw />
              </Button>
            </div>
            <div className="ml-auto flex min-w-0 items-center gap-1 rounded-lg border border-input bg-muted/40 px-1.5 py-1 sm:ml-auto sm:gap-1.5 sm:px-2">
              <span className="hidden text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:block">
                Seed
              </span>
              <input
                key={currentDocument.seed}
                aria-label={locale === 'en' ? 'Seed value' : 'Seed値'}
                className="min-w-0 w-[4.5rem] bg-transparent text-right font-mono text-xs font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-[4.8rem]"
                type="number"
                min={1}
                max={2147483647}
                defaultValue={currentDocument.seed}
                onBlur={(event) => {
                  const parsed = Math.round(Number(event.currentTarget.value));
                  const seed = Number.isFinite(parsed)
                    ? Math.min(2147483647, Math.max(1, parsed))
                    : currentDocument.seed;
                  event.currentTarget.value = String(seed);
                  editor.commit((document) => ({ ...document, seed }));
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                }}
              />
              <Button
                className="mobile-seed-action"
                variant="ghost"
                size="icon-xs"
                aria-label={
                  locale === 'en'
                    ? 'Regenerate from Seed'
                    : 'Seedからおまかせ全体を再現'
                }
                title={
                  locale === 'en'
                    ? 'Regenerate the whole pattern from this Seed and category'
                    : '現在のSeedとカテゴリーから模様全体を再現'
                }
                onClick={regenerateOmakaseFromSeed}
              >
                <WandSparkles />
              </Button>
              <Button
                className="mobile-seed-action"
                variant="ghost"
                size="icon-xs"
                aria-label={locale === 'en' ? 'Copy Seed' : 'Seedをコピー'}
                onClick={copySeed}
              >
                <Copy />
              </Button>
            </div>
          </div>
        </footer>

        <div
          aria-live="polite"
          className={`pointer-events-none fixed bottom-20 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-lg transition ${notice ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
        >
          {notice && (
            <>
              <Check className="size-3.5" />
              {notice}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
