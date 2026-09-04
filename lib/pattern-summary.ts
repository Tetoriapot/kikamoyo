import type { EditorDocument, PatternType } from '@/lib/pattern-types';
import type { Locale } from '@/lib/i18n';

const TYPE_NAMES: Record<PatternType, [string, string]> = {
  dots: ['ドット', 'dot'],
  circles: ['円', 'circle'],
  ellipse: ['楕円', 'ellipse'],
  squares: ['正方形', 'square'],
  rectangles: ['長方形', 'rectangle'],
  triangles: ['三角形', 'triangle'],
  diamonds: ['ひし形', 'diamond'],
  hexagons: ['六角形', 'hexagon'],
  octagons: ['八角形', 'octagon'],
  stars: ['星', 'star'],
  crosses: ['十字', 'cross'],
  lines: ['線', 'line'],
  doubleLines: ['二重線', 'double-line'],
  waves: ['波線', 'wave'],
  zigzag: ['ジグザグ', 'zigzag'],
  chevron: ['山形', 'chevron'],
  arcs: ['円弧', 'arc'],
  rings: ['リング', 'ring'],
  radial: ['放射', 'radial'],
  lowPoly: ['ローポリ', 'low-poly'],
  glassShards: ['半透明ライン', 'translucent shard'],
  geoCollage: ['幾何学ミックス', 'geometric collage'],
  quarterTiles: ['カーブタイル', 'quarter-circle tile'],
};

function orientation(width: number, height: number, locale: Locale) {
  if (Math.abs(width - height) < 2)
    return locale === 'ja' ? '正方形' : 'square';
  return width > height
    ? locale === 'ja'
      ? '横長'
      : 'landscape'
    : locale === 'ja'
      ? '縦長'
      : 'portrait';
}

export function describePattern(
  document: EditorDocument,
  locale: Locale = 'ja',
) {
  const visible = document.layers.filter((layer) => layer.visible);
  const primary = visible[0] ?? document.layers[0];
  const density =
    primary.config.density < 38
      ? locale === 'ja'
        ? 'ゆったりした'
        : 'open'
      : primary.config.density > 72
        ? locale === 'ja'
          ? '細かな'
          : 'fine'
        : locale === 'ja'
          ? 'ほどよい密度の'
          : 'balanced';
  const irregular = Math.max(
    primary.config.roughness,
    primary.config.jitterPosition,
    primary.config.jitterRotation,
  );
  const variation =
    irregular < 20
      ? locale === 'ja'
        ? '整然とした'
        : 'orderly'
      : irregular > 65
        ? locale === 'ja'
          ? '大胆に不規則な'
          : 'boldly irregular'
        : locale === 'ja'
          ? '自然に揺らいだ'
          : 'gently varied';
  const colors = document.palette.slice(0, 3).join('、');
  const type = TYPE_NAMES[primary.type][locale === 'ja' ? 0 : 1];
  const repeat = document.canvas.seamless
    ? locale === 'ja'
      ? 'シームレス'
      : 'seamless'
    : locale === 'ja'
      ? '通常配置'
      : 'non-seamless';
  const alpha = document.canvas.transparent
    ? locale === 'ja'
      ? '背景透明'
      : 'transparent background'
    : locale === 'ja'
      ? '背景あり'
      : 'opaque background';
  if (locale === 'en')
    return `A ${density}, ${variation} ${type} pattern using ${colors}. ${orientation(document.canvas.width, document.canvas.height, locale)} ${document.canvas.width} × ${document.canvas.height}, ${alpha}, ${repeat}, ${visible.length} visible layer${visible.length === 1 ? '' : 's'}.`;
  return `${colors}を使った、${density}${variation}${type}模様。${orientation(document.canvas.width, document.canvas.height, locale)} ${document.canvas.width} × ${document.canvas.height}、${alpha}、${repeat}、表示レイヤー${visible.length}枚。`;
}
