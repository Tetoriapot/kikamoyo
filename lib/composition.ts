import type { CanvasConfig } from '@/lib/pattern-types';

/** White retains artwork, black removes it. Stops are in canvas coordinates. */
export function textSpaceStops(space: NonNullable<CanvasConfig['textSpace']>) {
  const width = space.width;
  if (space.position === 'left')
    return [
      { offset: 0, color: 'black' },
      { offset: width, color: 'black' },
      { offset: Math.min(1, width + 0.12), color: 'white' },
      { offset: 1, color: 'white' },
    ];
  if (space.position === 'right')
    return [
      { offset: 0, color: 'white' },
      { offset: Math.max(0, 1 - width - 0.12), color: 'white' },
      { offset: 1 - width, color: 'black' },
      { offset: 1, color: 'black' },
    ];
  const start = (1 - width) / 2;
  return [
    { offset: 0, color: 'white' },
    { offset: Math.max(0, start - 0.12), color: 'white' },
    { offset: start, color: 'black' },
    { offset: 1 - start, color: 'black' },
    { offset: Math.min(1, 1 - start + 0.12), color: 'white' },
    { offset: 1, color: 'white' },
  ];
}
