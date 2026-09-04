export interface PurposePreset {
  id: string;
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
  width: number;
  height: number;
  seamless: boolean;
  transparent: boolean;
  tileSize: number;
  safeArea?: { top: number; right: number; bottom: number; left: number };
  recommendedFormat: 'png' | 'svg' | 'jpg' | 'webp';
}

export const PURPOSE_PRESETS: PurposePreset[] = [
  {
    id: 'sns-square',
    label: 'SNS 正方形',
    labelEn: 'Social square',
    description: '投稿の文字切れを防ぐ安全域つき',
    descriptionEn: 'Safe area for social posts',
    width: 1080,
    height: 1080,
    seamless: false,
    transparent: false,
    tileSize: 256,
    safeArea: { top: 0.08, right: 0.08, bottom: 0.08, left: 0.08 },
    recommendedFormat: 'png',
  },
  {
    id: 'story',
    label: 'ストーリー／リール',
    labelEn: 'Story / Reel',
    description: '上下のUIを避けた安全域つき',
    descriptionEn: 'Keeps content clear of app controls',
    width: 1080,
    height: 1920,
    seamless: false,
    transparent: false,
    tileSize: 256,
    safeArea: { top: 0.14, right: 0.07, bottom: 0.16, left: 0.07 },
    recommendedFormat: 'png',
  },
  {
    id: 'ogp',
    label: 'OGP・ブログ',
    labelEn: 'Open Graph / Blog',
    description: 'リンクカード向け 1.91:1',
    descriptionEn: '1.91:1 link preview image',
    width: 1200,
    height: 630,
    seamless: false,
    transparent: false,
    tileSize: 256,
    safeArea: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 },
    recommendedFormat: 'jpg',
  },
  {
    id: 'youtube',
    label: 'YouTube サムネイル',
    labelEn: 'YouTube thumbnail',
    description: '動画一覧で読みやすい16:9',
    descriptionEn: 'Readable 16:9 video cover',
    width: 1280,
    height: 720,
    seamless: false,
    transparent: false,
    tileSize: 256,
    safeArea: { top: 0.08, right: 0.08, bottom: 0.12, left: 0.08 },
    recommendedFormat: 'jpg',
  },
  {
    id: 'a4-print',
    label: 'A4 印刷',
    labelEn: 'A4 print',
    description: '300dpi相当・縦向き',
    descriptionEn: 'Portrait at 300 dpi equivalent',
    width: 2480,
    height: 3508,
    seamless: false,
    transparent: false,
    tileSize: 512,
    safeArea: { top: 0.06, right: 0.06, bottom: 0.06, left: 0.06 },
    recommendedFormat: 'png',
  },
  {
    id: 'wrapping',
    label: '包装紙・壁紙',
    labelEn: 'Wrapping / wallpaper',
    description: '継ぎ目のない正方形タイル',
    descriptionEn: 'Seamless square tile',
    width: 2048,
    height: 2048,
    seamless: true,
    transparent: false,
    tileSize: 512,
    recommendedFormat: 'png',
  },
  {
    id: 'transparent',
    label: '透過素材',
    labelEn: 'Transparent asset',
    description: 'ロゴ背景や重ね素材向け',
    descriptionEn: 'For overlays and logo backgrounds',
    width: 1024,
    height: 1024,
    seamless: false,
    transparent: true,
    tileSize: 256,
    safeArea: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 },
    recommendedFormat: 'png',
  },
];

export function purposePreset(id: string | null) {
  return PURPOSE_PRESETS.find((item) => item.id === id) ?? null;
}
