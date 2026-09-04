import type { RepeatMode } from '@/lib/pattern-types';

export interface RepeatPlacement {
  key: string;
  x: number;
  y: number;
  scaleX: 1 | -1;
  scaleY: 1 | -1;
}

export interface RepeatPlan {
  width: number;
  height: number;
  placements: RepeatPlacement[];
}

export function getRepeatPlan(
  mode: RepeatMode = 'straight',
  tileSize: number,
): RepeatPlan {
  const t = tileSize;
  if (mode === 'halfDrop')
    return {
      width: t * 2,
      height: t,
      placements: [
        { key: 'left', x: 0, y: 0, scaleX: 1, scaleY: 1 },
        { key: 'right-top', x: t, y: -t / 2, scaleX: 1, scaleY: 1 },
        { key: 'right-bottom', x: t, y: t / 2, scaleX: 1, scaleY: 1 },
      ],
    };
  if (mode === 'mirrorX')
    return {
      width: t * 2,
      height: t,
      placements: [
        { key: 'normal', x: 0, y: 0, scaleX: 1, scaleY: 1 },
        { key: 'mirror-x', x: t * 2, y: 0, scaleX: -1, scaleY: 1 },
      ],
    };
  if (mode === 'mirrorY')
    return {
      width: t,
      height: t * 2,
      placements: [
        { key: 'normal', x: 0, y: 0, scaleX: 1, scaleY: 1 },
        { key: 'mirror-y', x: 0, y: t * 2, scaleX: 1, scaleY: -1 },
      ],
    };
  if (mode === 'mirrorBoth')
    return {
      width: t * 2,
      height: t * 2,
      placements: [
        { key: 'normal', x: 0, y: 0, scaleX: 1, scaleY: 1 },
        { key: 'mirror-x', x: t * 2, y: 0, scaleX: -1, scaleY: 1 },
        { key: 'mirror-y', x: 0, y: t * 2, scaleX: 1, scaleY: -1 },
        { key: 'mirror-both', x: t * 2, y: t * 2, scaleX: -1, scaleY: -1 },
      ],
    };
  return {
    width: t,
    height: t,
    placements: [{ key: 'normal', x: 0, y: 0, scaleX: 1, scaleY: 1 }],
  };
}
