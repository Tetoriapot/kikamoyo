'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Inline SVG needs an explicit accessible image role. */
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PatternCanvas } from '@/lib/pattern-engine';
import type { EditorDocument } from '@/lib/pattern-types';
import type { Locale } from '@/lib/i18n';

export function LoopPreview({
  document,
  width,
  height,
  cellWidth,
  cellHeight,
  duration,
  cycles,
  direction,
  locale,
}: {
  document: EditorDocument;
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  duration: number;
  cycles: number;
  direction: 'left' | 'right' | 'up' | 'down';
  locale: Locale;
}) {
  const id = `loop-${useId().replaceAll(':', '')}`;
  const [playing, setPlaying] = useState(false);
  const en = locale === 'en';
  const dx =
    direction === 'left' ? -cellWidth : direction === 'right' ? cellWidth : 0;
  const dy =
    direction === 'up' ? -cellHeight : direction === 'down' ? cellHeight : 0;
  return (
    <figure className="space-y-2">
      <figcaption className="text-sm font-medium">
        {en ? 'Video preview at selected size' : '指定サイズの動画プレビュー'}
      </figcaption>
      <svg
        className="mx-auto max-h-72 w-full max-w-sm rounded-lg border"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={en ? 'Loop composition preview' : 'ループ動画の構図'}
      >
        <defs>
          <pattern
            id={id}
            width={cellWidth}
            height={cellHeight}
            patternUnits="userSpaceOnUse"
          >
            <PatternCanvas
              document={{
                ...document,
                canvas: { ...document.canvas, transparent: false },
              }}
              decorative
              viewport="fundamentalTile"
              outputWidth={cellWidth}
              outputHeight={cellHeight}
            />
            {playing && (
              <animateTransform
                attributeName="patternTransform"
                type="translate"
                from="0 0"
                to={`${dx} ${dy}`}
                dur={`${duration / cycles}s`}
                repeatCount="indefinite"
              />
            )}
          </pattern>
        </defs>
        <rect width={width} height={height} fill={`url(#${id})`} />
      </svg>
      <Button
        variant="outline"
        size="sm"
        aria-pressed={playing}
        onClick={() => setPlaying(!playing)}
      >
        {playing
          ? en
            ? 'Pause preview'
            : 'プレビューを停止'
          : en
            ? 'Play preview'
            : 'プレビューを再生'}
      </Button>
    </figure>
  );
}
