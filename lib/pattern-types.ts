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
