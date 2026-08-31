import type { EditorDocument, PatternLayer, PatternPreset, PatternType, PlacementType, PresetCategory } from '@/lib/pattern-types';
import { cloneDocument } from '@/lib/pattern-types';

const PALETTES = {
  monochrome: ['#F7F7F5', '#16181D', '#5B606B', '#A7ABB3'],
  grayscale: ['#F2F3F4', '#22262D', '#717780', '#C3C6CB'],
  pastel: ['#FFF8F4', '#F5A9B8', '#8FC9C5', '#F4D58D', '#A9B8E8'],
  vivid: ['#FFF8ED', '#FF4D6D', '#3A86FF', '#FFBE0B', '#2EC4B6', '#8338EC'],
  retro: ['#F4E4C1', '#C8553D', '#2A9D8F', '#E0A458', '#5D2A42'],
  nordic: ['#F2F1E8', '#305F72', '#5B8E7D', '#D9A441', '#B65E4B'],
  japanese: ['#F7F0E3', '#1D4E89', '#A23E48', '#C99A45', '#355B4C'],
  night: ['#08152E', '#E8F1FF', '#8295D9', '#F0C85A', '#B46BD4'],
  ocean: ['#EDF8FA', '#023E8A', '#0077B6', '#00B4D8', '#90E0EF'],
  forest: ['#EFF4EA', '#1B4332', '#40916C', '#95B46A', '#D4A373'],
  autumn: ['#FFF4E1', '#9C2C2C', '#D2691E', '#E9A23B', '#6B4F3A'],
  sakura: ['#FFF7FA', '#E88CA5', '#F2B5C4', '#8C5E78', '#D6B56D'],
  gold: ['#14151A', '#D7B66B', '#F1DFB7', '#8E6D2E', '#FFF8DE'],
  neon: ['#090B1B', '#5EF2E7', '#806DFF', '#FF4FA3', '#F9E547'],
  cyber: ['#050816', '#00F5D4', '#00BBF9', '#9B5DE5', '#F15BB5'],
  artdeco: ['#101116', '#D4AF37', '#F6E7B0', '#8C6B22', '#D8D3C5'],
  oldbook: ['#EDE0C8', '#4B3527', '#7F5539', '#B08968', '#6B705C'],
  cream: ['#FBF5E9', '#30475E', '#D56A5B', '#7B9E87', '#D7B56D'],
  darkfantasy: ['#0D0814', '#7B2CBF', '#C77DFF', '#D4AF37', '#3C6E71'],
  magic: ['#15102C', '#BDE0FE', '#C77DFF', '#FEE440', '#F694C1'],
} as const;

type PaletteName = keyof typeof PALETTES;

interface GroupSpec {
  id: PresetCategory;
  label: string;
  names: string[];
  types: PatternType[];
  placements: PlacementType[];
  palettes: PaletteName[];
  tags: string[];
}

const GROUPS: GroupSpec[] = [
  {
    id: 'basic', label: 'BASIC', palettes: ['monochrome', 'pastel', 'nordic'], tags: ['simple', 'minimal', 'cute', 'cool'],
    names: ['ミニドット', 'ラージドット', 'ハーフトーンドット', 'スクエアグリッド', 'ダイヤグリッド', 'ミニトライアングル', 'ヘキサグリッド', 'ハニカムライン', 'サークルリング', 'クロスグリッド'],
    types: ['dots', 'circles', 'dots', 'squares', 'diamonds', 'triangles', 'hexagons', 'hexagons', 'rings', 'crosses'],
    placements: ['grid', 'offsetGrid', 'diagonal', 'grid', 'grid', 'offsetGrid', 'hexGrid', 'hexGrid', 'grid', 'grid'],
  },
  {
    id: 'line', label: 'LINE', palettes: ['monochrome', 'cream', 'nordic'], tags: ['line', 'stripe', 'minimal', 'print'],
    names: ['縦ストライプ', '横ストライプ', '太ストライプ', '斜めストライプ右', '斜めストライプ左', 'ダブルストライプ', 'ピンストライプ', 'ランダムライン', 'クロスハッチ', 'グリッドライン'],
    types: ['lines', 'lines', 'lines', 'lines', 'lines', 'doubleLines', 'lines', 'lines', 'doubleLines', 'lines'],
    placements: ['stripe', 'stripe', 'stripe', 'diagonal', 'diagonal', 'stripe', 'stripe', 'random', 'diagonal', 'grid'],
  },
  {
    id: 'wave', label: 'ZIGZAG / WAVE', palettes: ['ocean', 'pastel', 'cyber'], tags: ['wave', 'zigzag', 'line', 'cool'],
    names: ['クラシックシェブロン', 'ワイドシェブロン', 'ミニジグザグ', 'ランダムジグザグ', 'サインウェーブ', 'ダブルウェーブ', 'ゆる波', '海波', '音波', '電流'],
    types: ['chevron', 'chevron', 'zigzag', 'zigzag', 'waves', 'waves', 'waves', 'waves', 'waves', 'zigzag'],
    placements: ['grid', 'grid', 'grid', 'wave', 'wave', 'wave', 'wave', 'wave', 'stripe', 'diagonal'],
  },
  {
    id: 'circle', label: 'CIRCLE', palettes: ['pastel', 'ocean', 'retro'], tags: ['circle', 'dot', 'pop', 'cute'],
    names: ['水玉ポップ', 'バブル', '同心円', 'ターゲット', '半円タイル', '円弧', 'オービット', '惑星', 'シャボン玉', 'レトロサークル'],
    types: ['circles', 'circles', 'rings', 'rings', 'arcs', 'arcs', 'rings', 'rings', 'circles', 'circles'],
    placements: ['offsetGrid', 'random', 'concentric', 'grid', 'brick', 'offsetGrid', 'diagonal', 'random', 'random', 'offsetGrid'],
  },
  {
    id: 'block', label: 'BLOCK', palettes: ['monochrome', 'vivid', 'oldbook'], tags: ['square', 'pop', 'print', 'web'],
    names: ['市松', 'カラーブロック', 'レンガ', 'ミニレンガ', '縦長ブロック', 'ランダムタイル', 'モンドリアン風', 'ピクセル', 'デジタルブロック', 'QR風'],
    types: ['squares', 'squares', 'rectangles', 'rectangles', 'rectangles', 'squares', 'rectangles', 'squares', 'rectangles', 'squares'],
    placements: ['checker', 'checker', 'brick', 'brick', 'stripe', 'random', 'grid', 'grid', 'random', 'pseudoRandom'],
  },
  {
    id: 'japanese', label: '和風', palettes: ['japanese', 'sakura', 'gold'], tags: ['japanese', 'print', 'seamless', 'trpg'],
    names: ['麻の葉風', '青海波風', '七宝風', '市松和風', '矢絣風', '鱗文様風', '籠目風', '亀甲風', '波千鳥抽象', '金箔散らし'],
    types: ['radial', 'arcs', 'rings', 'squares', 'chevron', 'triangles', 'triangles', 'hexagons', 'waves', 'diamonds'],
    placements: ['hexGrid', 'brick', 'offsetGrid', 'checker', 'offsetGrid', 'offsetGrid', 'hexGrid', 'hexGrid', 'wave', 'random'],
  },
  {
    id: 'artdeco', label: 'ART DECO', palettes: ['artdeco', 'gold', 'cream'], tags: ['artdeco', 'gold', 'dark', 'cool'],
    names: ['ゴールドファン', 'サンバースト', 'ブラックゴールド', '階段アールデコ', 'ダイヤデコ', 'クラシックホテル', 'ギャツビー', 'アーチデコ', 'ゴールドフレーム', 'エンパイア'],
    types: ['arcs', 'radial', 'lines', 'chevron', 'diamonds', 'lines', 'arcs', 'arcs', 'squares', 'doubleLines'],
    placements: ['radial', 'radial', 'diagonal', 'stripe', 'grid', 'stripe', 'radial', 'brick', 'grid', 'stripe'],
  },
  {
    id: 'retro', label: 'RETRO', palettes: ['retro', 'vivid', 'oldbook'], tags: ['retro', 'pop', 'cute', 'background'],
    names: ['70sオレンジ', '80sメンフィス', '90sポップ', 'レトロ包装紙', 'レコード', 'VHSノイズ', 'ファミコン', 'レトロゲーム', '昭和喫茶', 'サイケデリック'],
    types: ['waves', 'triangles', 'stars', 'diamonds', 'rings', 'lines', 'squares', 'dots', 'circles', 'waves'],
    placements: ['wave', 'random', 'random', 'offsetGrid', 'grid', 'stripe', 'grid', 'grid', 'offsetGrid', 'wave'],
  },
  {
    id: 'scifi', label: 'SF / CYBER', palettes: ['cyber', 'neon', 'night'], tags: ['scifi', 'cyber', 'cool', 'dark'],
    names: ['サイバーグリッド', 'デジタル回路', 'HUD', 'スキャンライン', 'ネオンヘックス', 'データストリーム', 'マトリクス抽象', 'グリッチ', 'スペースレーダー', 'AIネットワーク'],
    types: ['lines', 'lines', 'rings', 'lines', 'hexagons', 'lines', 'rectangles', 'rectangles', 'radial', 'dots'],
    placements: ['grid', 'grid', 'concentric', 'stripe', 'hexGrid', 'stripe', 'stripe', 'random', 'concentric', 'random'],
  },
  {
    id: 'magic', label: 'MAGIC / FANTASY', palettes: ['magic', 'darkfantasy', 'night'], tags: ['magic', 'fantasy', 'trpg', 'dark'],
    names: ['魔法陣ライト', '星座', 'ルーン風', '錬金術図形風', '月相', 'クリスタル', '聖堂ステンドグラス', 'ダークマジック', '天体軌道', '万華鏡'],
    types: ['rings', 'dots', 'zigzag', 'triangles', 'circles', 'diamonds', 'radial', 'rings', 'rings', 'triangles'],
    placements: ['concentric', 'random', 'pseudoRandom', 'concentric', 'stripe', 'random', 'radial', 'concentric', 'concentric', 'kaleidoscope'],
  },
];

const TYPE_TAG: Partial<Record<PatternType, string>> = {
  dots: 'dot', circles: 'circle', squares: 'square', rectangles: 'square', triangles: 'triangle',
  hexagons: 'hexagon', lines: 'line', doubleLines: 'line', waves: 'wave', zigzag: 'zigzag', chevron: 'zigzag',
};

function stableSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 900000 + 100000;
}

function layer(id: string, name: string, type: PatternType, placement: PlacementType, size: number, gap: number, rotation: number, roughness: number, colorIndex: number, visible = true): PatternLayer {
  const lineLike = ['lines', 'doubleLines', 'waves', 'zigzag', 'chevron', 'arcs', 'rings', 'radial'].includes(type);
  return {
    id, name, type, visible, opacity: 1, blendMode: 'normal', offsetX: 0, offsetY: 0,
    rotation, scale: 1, colorIndex,
    config: {
      placement, size, aspectX: type === 'ellipse' ? 1.3 : 1, aspectY: type === 'rectangles' ? 0.65 : 1,
      gap, density: 60, strokeWidth: lineLike ? Math.max(1.5, Math.min(5, size * 0.1)) : 2,
      cornerRadius: type === 'rectangles' || type === 'squares' ? Math.min(8, size * 0.12) : 0,
      fillMode: lineLike ? 'stroke' : 'fill', roughness,
      jitterPosition: roughness, jitterRotation: roughness, jitterSize: Math.round(roughness * 0.7),
      jitterColor: Math.round(roughness * 0.8), jitterOpacity: Math.round(roughness * 0.45),
    },
  };
}

function makeDocument(group: GroupSpec, groupIndex: number, itemIndex: number, id: string, name: string): EditorDocument {
  const paletteName = group.palettes[itemIndex % group.palettes.length];
  const palette = [...PALETTES[paletteName]];
  const primaryType = group.types[itemIndex];
  const placement = group.placements[itemIndex];
  const size = 10 + ((itemIndex * 7 + groupIndex * 4) % 38);
  const gap = 22 + ((itemIndex * 9 + groupIndex * 5) % 46);
  const rotation = placement === 'diagonal' ? (itemIndex % 2 ? -45 : 45) : (itemIndex * 7) % 30;
  const roughness = ['random', 'pseudoRandom'].includes(placement) ? 42 + (itemIndex % 4) * 9 : (itemIndex % 4) * 5;
  const layers: PatternLayer[] = [layer(`${id}-main`, name, primaryType, placement, size, gap, rotation, roughness, 0)];

  const accentTypes: PatternType[] = ['dots', 'rings', 'lines', 'diamonds', 'crosses'];
  const accentPlacements: PlacementType[] = ['offsetGrid', 'grid', 'diagonal', 'random', 'symmetric'];
  const special = ['80sメンフィス', '魔法陣ライト', '錬金術図形風', '聖堂ステンドグラス', '万華鏡', 'HUD', 'AIネットワーク', '星座'].includes(name.replaceAll(' ', ''));
  layers.push(layer(`${id}-accent`, 'アクセント', special && name.includes('魔法陣') ? 'triangles' : accentTypes[(itemIndex + groupIndex) % accentTypes.length],
    special && name.includes('万華鏡') ? 'kaleidoscope' : accentPlacements[(itemIndex + groupIndex) % accentPlacements.length],
    Math.max(6, size * 0.48), Math.max(24, gap * 1.45), -rotation, Math.min(78, roughness + 8), 2, special || itemIndex % 3 === 1));
  layers[1].opacity = special ? 0.8 : 0.58;
  layers[1].blendMode = group.id === 'scifi' || group.id === 'magic' ? 'screen' : 'normal';

  layers.push(layer(`${id}-detail`, 'ディテール', special && (name.includes('魔法陣') || name.includes('HUD')) ? 'radial' : (itemIndex % 2 ? 'circles' : 'lines'),
    special ? (name.includes('万華鏡') ? 'symmetric' : 'concentric') : 'grid', Math.max(5, size * 0.26), Math.max(34, gap * 1.9), rotation + 30, Math.min(70, roughness + 14), 3, special));
  layers[2].opacity = 0.5;
  layers[2].blendMode = group.id === 'scifi' || group.id === 'magic' ? 'screen' : 'multiply';

  if (name === '80sメンフィス') {
    layers[0] = layer(`${id}-main`, '三角形', 'triangles', 'random', 25, 62, 14, 46, 0);
    layers[1] = layer(`${id}-accent`, 'カラフルドット', 'circles', 'offsetGrid', 15, 74, 0, 28, 1);
    layers[2] = layer(`${id}-detail`, 'ライン', 'zigzag', 'diagonal', 30, 84, -12, 36, 2);
    layers[1].opacity = 0.88;
    layers[2].opacity = 0.72;
  }

  return {
    schemaVersion: 1, seed: stableSeed(id), palette: palette.slice(1),
    canvas: { width: 1080, height: 1080, background: palette[0], transparent: false, seamless: true, tileSize: 512, flipX: false, flipY: false },
    layers,
  };
}

export const PRESETS: PatternPreset[] = GROUPS.flatMap((group, groupIndex) => group.names.map((name, itemIndex) => {
  const number = groupIndex * 10 + itemIndex + 1;
  const id = `${group.id}-${String(number).padStart(3, '0')}`;
  const paletteName = group.palettes[itemIndex % group.palettes.length];
  const type = group.types[itemIndex];
  const placement = group.placements[itemIndex];
  return {
    id, name, category: [group.id], categoryLabel: group.label,
    tags: [...new Set([...group.tags, type, TYPE_TAG[type] ?? type, placement, paletteName, 'background', 'seamless', number % 2 ? 'print' : 'web'])],
    document: makeDocument(group, groupIndex, itemIndex, id, name),
  };
}));

export const INITIAL_PRESET = PRESETS.find((preset) => preset.name === '80sメンフィス') ?? PRESETS[0];

export const CATEGORY_OPTIONS = [
  { value: 'all', label: 'すべて' },
  ...GROUPS.map((group) => ({ value: group.id, label: group.label })),
] as const;

export const PALETTE_OPTIONS = Object.entries(PALETTES).map(([id, colors]) => ({ id, colors: [...colors] }));

export function presetDocument(preset: PatternPreset) {
  return cloneDocument(preset.document);
}
