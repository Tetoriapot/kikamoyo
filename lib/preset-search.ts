import type { PatternPreset } from '@/lib/pattern-types';

const SYNONYMS: Record<string, string[]> = {
  三角: ['triangle', 'triangles', 'polygon', 'lowpoly', 'ローポリ'],
  多角形: ['polygon', 'lowpoly', 'triangles'],
  ポリゴン: ['polygon', 'lowpoly', 'triangles'],
  青: ['blue', 'ocean', 'cyan', 'navy'],
  水色: ['cyan', 'sky', 'blue'],
  紫: ['purple', 'violet', 'lavender'],
  黄色: ['yellow', 'lemon', 'gold'],
  線: ['line', 'lines', 'shard', 'stripe'],
  透明: ['glass', 'shard', 'pastel'],
  丸: ['circle', 'circles', 'ring', 'dots'],
  曲線: ['curve', 'wave', 'arc', 'quarter'],
  和風: ['japanese', 'seigaiha', 'asanoha', 'wagara'],
  レトロ: ['retro', 'vintage', 'memphis'],
  明るい: ['pastel', 'vivid', 'bright'],
  暗い: ['night', 'dark', 'cyber'],
};

export function presetSearchText(preset: PatternPreset) {
  return `${preset.name} ${preset.categoryLabel} ${preset.category.join(' ')} ${preset.tags.join(' ')}`.toLowerCase();
}

export function matchesPresetSearch(preset: PatternPreset, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const terms = normalized
    .split(/\s+/)
    .flatMap((term) => [term, ...(SYNONYMS[term] ?? [])]);
  const haystack = presetSearchText(preset);
  return terms.some((term) => haystack.includes(term));
}
