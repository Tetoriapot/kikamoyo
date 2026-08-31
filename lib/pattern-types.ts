export const PATTERN_TYPES = [
  'dots', 'circles', 'ellipse', 'squares', 'rectangles', 'triangles', 'diamonds',
  'hexagons', 'octagons', 'stars', 'crosses', 'lines', 'doubleLines', 'waves',
  'zigzag', 'chevron', 'arcs', 'rings', 'radial',
] as const;

export type PatternType = (typeof PATTERN_TYPES)[number];

export const PATTERN_LABELS: Record<PatternType, string> = {
  dots: 'ドット', circles: '円', ellipse: '楕円', squares: '正方形', rectangles: '長方形',
  triangles: '三角形', diamonds: 'ひし形', hexagons: '六角形', octagons: '八角形',
  stars: '星', crosses: '十字', lines: '線', doubleLines: '二重線', waves: '波線',
  zigzag: 'ジグザグ', chevron: '山形', arcs: '円弧', rings: 'リング', radial: '放射',
};

export const PLACEMENT_TYPES = [
  'grid', 'offsetGrid', 'brick', 'hexGrid', 'checker', 'diagonal', 'radial',
  'concentric', 'wave', 'stripe', 'random', 'pseudoRandom', 'tile',
  'kaleidoscope', 'symmetric',
] as const;

export type PlacementType = (typeof PLACEMENT_TYPES)[number];

export const PLACEMENT_LABELS: Record<PlacementType, string> = {
  grid: '通常グリッド', offsetGrid: '交互グリッド', brick: 'レンガ配置', hexGrid: 'ハニカム',
  checker: '市松', diagonal: '斜め配置', radial: '放射状', concentric: '同心円', wave: '波状',
  stripe: 'ストライプ', random: 'ランダム', pseudoRandom: '疑似ランダム', tile: 'タイル',
  kaleidoscope: '万華鏡風', symmetric: '対称配置',
};

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'difference';
export type FillMode = 'fill' | 'stroke' | 'both';

export interface PatternConfig {
  placement: PlacementType;
  size: number;
  aspectX: number;
  aspectY: number;
  gap: number;
  density: number;
  strokeWidth: number;
  cornerRadius: number;
  fillMode: FillMode;
  roughness: number;
  jitterPosition: number;
  jitterRotation: number;
  jitterSize: number;
  jitterColor: number;
  jitterOpacity: number;
}

export interface PatternLayer {
  id: string;
  name: string;
  type: PatternType;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  offsetX: number;
  offsetY: number;
  rotation: number;
  scale: number;
  colorIndex: number;
  config: PatternConfig;
}

export interface CanvasConfig {
  width: number;
  height: number;
  background: string;
  transparent: boolean;
  seamless: boolean;
  tileSize: number;
  flipX: boolean;
  flipY: boolean;
}

export interface EditorDocument {
  schemaVersion: 1;
  seed: number;
  palette: string[];
  canvas: CanvasConfig;
  layers: PatternLayer[];
}

export interface OmakaseGeneration {
  kind: 'omakase';
  category: string;
  algorithmVersion: 1;
}

export interface EditorSnapshot {
  sessionVersion: 1;
  document: EditorDocument;
  presetId: string | null;
  presetName: string;
  activeLayerId: string | null;
  generation?: OmakaseGeneration;
}

export type PresetCategory = 'basic' | 'line' | 'wave' | 'circle' | 'block' | 'japanese' | 'artdeco' | 'retro' | 'scifi' | 'magic';

export interface PatternPreset {
  id: string;
  name: string;
  category: PresetCategory[];
  categoryLabel: string;
  tags: string[];
  document: EditorDocument;
}

export const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: '通常' }, { value: 'multiply', label: '乗算' },
  { value: 'screen', label: 'スクリーン' }, { value: 'overlay', label: 'オーバーレイ' },
  { value: 'darken', label: '比較（暗）' }, { value: 'lighten', label: '比較（明）' },
  { value: 'difference', label: '差の絶対値' },
];

export const CANVAS_SIZES = [
  ['512 × 512', 512, 512], ['1024 × 1024', 1024, 1024], ['2048 × 2048', 2048, 2048],
  ['4K 横', 3840, 2160], ['フルHD 横', 1920, 1080], ['フルHD 縦', 1080, 1920],
  ['SNS 正方形', 1080, 1080], ['OGP', 1200, 630], ['A4 縦', 2480, 3508],
  ['A4 横', 3508, 2480], ['A5 縦', 1748, 2480], ['A5 横', 2480, 1748],
] as const;

export function cloneDocument(document: EditorDocument): EditorDocument {
  return JSON.parse(JSON.stringify(document)) as EditorDocument;
}

export function cloneSnapshot(snapshot: EditorSnapshot): EditorSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as EditorSnapshot;
}

const BLEND_MODE_VALUES: readonly BlendMode[] = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'difference'];
const FILL_MODE_VALUES: readonly FillMode[] = ['fill', 'stroke', 'both'];
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteInRange(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function isIntegerInRange(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isInteger(value) && isFiniteInRange(value, min, max);
}

function isPatternConfig(value: unknown): value is PatternConfig {
  if (!isRecord(value)) return false;
  return PLACEMENT_TYPES.includes(value.placement as PlacementType)
    && isFiniteInRange(value.size, 0.1, 100_000)
    && isFiniteInRange(value.aspectX, 0.01, 100)
    && isFiniteInRange(value.aspectY, 0.01, 100)
    && isFiniteInRange(value.gap, 0.1, 100_000)
    && isFiniteInRange(value.density, 0, 1_000)
    && isFiniteInRange(value.strokeWidth, 0, 10_000)
    && isFiniteInRange(value.cornerRadius, 0, 100_000)
    && FILL_MODE_VALUES.includes(value.fillMode as FillMode)
    && isFiniteInRange(value.roughness, 0, 100)
    && isFiniteInRange(value.jitterPosition, 0, 100)
    && isFiniteInRange(value.jitterRotation, 0, 100)
    && isFiniteInRange(value.jitterSize, 0, 100)
    && isFiniteInRange(value.jitterColor, 0, 100)
    && isFiniteInRange(value.jitterOpacity, 0, 100);
}

function isPatternLayer(value: unknown): value is PatternLayer {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' && value.id.length > 0 && value.id.length <= 256
    && typeof value.name === 'string' && value.name.length > 0 && value.name.length <= 256
    && PATTERN_TYPES.includes(value.type as PatternType)
    && typeof value.visible === 'boolean'
    && isFiniteInRange(value.opacity, 0, 1)
    && BLEND_MODE_VALUES.includes(value.blendMode as BlendMode)
    && isFiniteInRange(value.offsetX, -100_000, 100_000)
    && isFiniteInRange(value.offsetY, -100_000, 100_000)
    && isFiniteInRange(value.rotation, -100_000, 100_000)
    && isFiniteInRange(value.scale, 0.01, 100)
    && isIntegerInRange(value.colorIndex, 0, 10_000)
    && isPatternConfig(value.config);
}

export function isEditorDocument(value: unknown): value is EditorDocument {
  if (!isRecord(value) || value.schemaVersion !== 1 || !isIntegerInRange(value.seed, 1, 2_147_483_647)) return false;
  if (!Array.isArray(value.palette) || value.palette.length < 1 || value.palette.length > 8
    || !value.palette.every((color) => typeof color === 'string' && HEX_COLOR.test(color))) return false;
  if (!isRecord(value.canvas)) return false;
  const canvas = value.canvas;
  if (!isIntegerInRange(canvas.width, 64, 16_384)
    || !isIntegerInRange(canvas.height, 64, 16_384)
    || typeof canvas.background !== 'string' || !HEX_COLOR.test(canvas.background)
    || typeof canvas.transparent !== 'boolean'
    || typeof canvas.seamless !== 'boolean'
    || !isIntegerInRange(canvas.tileSize, 64, 4_096)
    || typeof canvas.flipX !== 'boolean'
    || typeof canvas.flipY !== 'boolean') return false;
  if (!Array.isArray(value.layers) || value.layers.length < 1 || value.layers.length > 5 || !value.layers.every(isPatternLayer)) return false;
  return new Set(value.layers.map((layer) => layer.id)).size === value.layers.length;
}

export function isEditorSnapshot(value: unknown): value is EditorSnapshot {
  if (!isRecord(value) || value.sessionVersion !== 1 || !isEditorDocument(value.document)) return false;
  if (value.presetId !== null && (typeof value.presetId !== 'string' || value.presetId.length > 256)) return false;
  if (typeof value.presetName !== 'string' || value.presetName.length < 1 || value.presetName.length > 256) return false;
  if (value.activeLayerId !== null && typeof value.activeLayerId !== 'string') return false;
  if (value.generation !== undefined) {
    if (!isRecord(value.generation) || value.generation.kind !== 'omakase'
      || typeof value.generation.category !== 'string' || value.generation.category.length > 64
      || value.generation.algorithmVersion !== 1) return false;
  }
  return true;
}

export function normalizeSnapshot(snapshot: EditorSnapshot): EditorSnapshot {
  const next = cloneSnapshot(snapshot);
  if (!next.document.layers.some((layer) => layer.id === next.activeLayerId)) {
    next.activeLayerId = next.document.layers[0]?.id ?? null;
  }
  return next;
}

export function parseEditorSnapshot(value: unknown, fallbackName = '復元した模様'): EditorSnapshot | null {
  if (isEditorSnapshot(value)) return normalizeSnapshot(value);
  if (!isEditorDocument(value)) return null;
  return {
    sessionVersion: 1,
    document: cloneDocument(value),
    presetId: null,
    presetName: fallbackName,
    activeLayerId: value.layers[0]?.id ?? null,
  };
}
