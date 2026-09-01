import { ALL_PRESETS, PRESETS, presetDocument } from '@/data/presets';
import { hashUnit } from '@/lib/seed';
import type { EditorDocument, OmakaseGeneration, PatternPreset } from '@/lib/pattern-types';

export const OMAKASE_CATEGORIES = [
  ['all', '完全ランダム'], ['basic', 'シンプル'], ['cute', 'かわいい'], ['cool', 'クール'],
  ['abstract', '抽象背景'],
  ['japanese', '和風'], ['retro', 'レトロ'], ['scifi', 'SF'], ['magic', '魔法'],
  ['artdeco', '高級'], ['pop', 'ポップ'], ['dark', 'ダーク'], ['trpg', 'TRPG'], ['background', '背景向け'],
] as const;

export type OmakaseCategory = (typeof OMAKASE_CATEGORIES)[number][0];

export interface OmakaseResult {
  document: EditorDocument;
  preset: PatternPreset;
  generation: OmakaseGeneration;
}

function seededUnit(seed: number, key: number, channel = 0) {
  return hashUnit(seed, 'kikamoyo-generator', key, channel);
}

export function normalizeOmakaseSeed(seed: number) {
  if (!Number.isFinite(seed)) return 1;
  return Math.min(2_147_483_647, Math.max(1, Math.round(seed)));
}

export function generateOmakase(seedInput: number, categoryInput: string, algorithmVersion: 1 | 2 = 2): OmakaseResult {
  const seed = normalizeOmakaseSeed(seedInput);
  const category = OMAKASE_CATEGORIES.some(([value]) => value === categoryInput)
    ? categoryInput as OmakaseCategory
    : 'all';
  const source = algorithmVersion === 1 ? PRESETS : ALL_PRESETS;
  const filtered = category === 'all'
    ? source
    : source.filter((preset) => preset.category.includes(category as never) || preset.tags.includes(category));
  const candidates = filtered.length ? filtered : source;
  const preset = candidates[Math.floor(seededUnit(seed, 0) * candidates.length)] ?? PRESETS[0];
  const document = presetDocument(preset);
  document.seed = seed;
  document.layers = document.layers.map((layer, index) => ({
    ...layer,
    rotation: layer.rotation + Math.round(seededUnit(seed, index, 10) * 28 - 14),
    config: {
      ...layer.config,
      size: Math.round(layer.config.size * (0.82 + seededUnit(seed, index, 11) * 0.36)),
      density: Math.round(46 + seededUnit(seed, index, 12) * 34),
      roughness: Math.round(8 + seededUnit(seed, index, 13) * 48),
      jitterPosition: Math.round(8 + seededUnit(seed, index, 14) * 54),
      jitterRotation: Math.round(8 + seededUnit(seed, index, 15) * 58),
      jitterSize: Math.round(4 + seededUnit(seed, index, 16) * 44),
      jitterColor: Math.round(18 + seededUnit(seed, index, 17) * 62),
      jitterOpacity: Math.round((index === 0 ? 6 : 16) + seededUnit(seed, index, 18) * 24),
    },
  }));

  return {
    document,
    preset,
    generation: { kind: 'omakase', category, algorithmVersion },
  };
}

export function inferLegacyOmakaseGeneration(document: EditorDocument): OmakaseGeneration | undefined {
  const signature = JSON.stringify(document);
  for (const [category] of OMAKASE_CATEGORIES) {
    const candidate = generateOmakase(document.seed, category, 1);
    if (JSON.stringify(candidate.document) === signature) return candidate.generation;
  }
  return undefined;
}
