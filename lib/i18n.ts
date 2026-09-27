export type Locale = 'ja' | 'en';

export function repeatLabel(value: string, locale: Locale) {
  const labels: Record<string, [string, string]> = {
    straight: ['通常リピート', 'Straight repeat'],
    halfDrop: ['ハーフドロップ', 'Half drop'],
    mirrorX: ['左右ミラー', 'Mirror horizontally'],
    mirrorY: ['上下ミラー', 'Mirror vertically'],
    mirrorBoth: ['上下左右ミラー', 'Mirror both'],
  };
  return labels[value]?.[locale === 'en' ? 1 : 0] ?? value;
}
export function paletteLabel(value: string, locale: Locale) {
  const labels: Record<string, string> = {
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
  return locale === 'ja'
    ? (labels[value] ?? value)
    : value.replace(/([A-Z])/g, ' $1');
}

const COPY = {
  ja: {
    simple: 'やさしい',
    detail: '詳細',
    create: 'つくる',
    color: '色',
    size: 'サイズ',
    presets: '見本',
    pattern: 'パターン',
    rough: '崩し',
    layers: 'レイヤー',
    canvas: 'キャンバス',
    projects: 'プロジェクト',
    display: '表示と言語',
    export: '書き出し',
    currentPattern: '現在の模様',
    safeArea: '安全域',
    density: '細かさ',
    variation: 'ばらつき',
    opacity: '濃さ',
    generated: '生成した幾何学模様',
    skipMain: '本文へ',
    skipPreview: '模様プレビューへ',
    skipControls: '編集設定へ',
    skipPresets: '見本へ',
    skipQuick: 'クイック操作へ',
  },
  en: {
    simple: 'Easy',
    detail: 'Advanced',
    create: 'Create',
    color: 'Color',
    size: 'Size',
    presets: 'Presets',
    pattern: 'Pattern',
    rough: 'Variation',
    layers: 'Layers',
    canvas: 'Canvas',
    projects: 'Projects',
    display: 'Display & language',
    export: 'Export',
    currentPattern: 'Current pattern',
    safeArea: 'Safe area',
    density: 'Detail',
    variation: 'Variation',
    opacity: 'Opacity',
    generated: 'Generated geometric pattern',
    skipMain: 'Skip to main content',
    skipPreview: 'Skip to pattern preview',
    skipControls: 'Skip to editor controls',
    skipPresets: 'Skip to presets',
    skipQuick: 'Skip to quick actions',
  },
} as const;

export type CopyKey = keyof typeof COPY.ja;
export function t(locale: Locale, key: CopyKey) {
  return COPY[locale][key];
}
