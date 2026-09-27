'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PatternCanvas } from '@/lib/pattern-engine';
import type { EditorDocument } from '@/lib/pattern-types';
import type { Locale } from '@/lib/i18n';

export function MockupPanel({
  document,
  locale,
}: {
  document: EditorDocument;
  locale: Locale;
}) {
  const [kind, setKind] = useState<'wrap' | 'fabric' | 'slide' | 'stream'>(
    'wrap',
  );
  const en = locale === 'en';
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['wrap', 'fabric', 'slide', 'stream'] as const).map(
          (value, index) => (
            <Button
              variant={kind === value ? 'secondary' : 'outline'}
              aria-pressed={kind === value}
              key={value}
              onClick={() => setKind(value)}
            >
              {
                (en
                  ? ['Wrapping', 'Fabric', 'Slide', 'Stream']
                  : ['包装紙', '布地', 'スライド', '配信画面'])[index]
              }
            </Button>
          ),
        )}
      </div>
      <div
        className="flex min-h-72 items-center justify-center overflow-hidden rounded-2xl bg-muted p-6"
        aria-label={en ? 'Mockup preview' : '使用イメージのプレビュー'}
      >
        <div
          className={`relative isolate w-full overflow-hidden shadow-xl ${kind === 'wrap' ? 'aspect-square max-w-72 rotate-[-6deg] border-b-[14px] border-r-[10px] border-black/20' : kind === 'fabric' ? 'aspect-[4/3] max-w-lg rounded-[10%_3%_15%_2%]' : 'aspect-video max-w-2xl rounded-lg'}`}
        >
          <PatternCanvas
            document={document}
            className="absolute inset-0 h-full w-full"
            viewBox={{
              x: 0,
              y: 0,
              width: document.canvas.width,
              height:
                kind === 'slide' || kind === 'stream'
                  ? (document.canvas.width * 9) / 16
                  : document.canvas.height,
            }}
          />
          {kind === 'wrap' && (
            <>
              <div className="absolute inset-y-0 left-[42%] w-[16%] bg-white/80 shadow-md" />
              <div className="absolute inset-x-0 top-[42%] h-[16%] bg-white/80 shadow-md" />
            </>
          )}
          {kind === 'fabric' && (
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(105deg,transparent 0%,#0003 15%,#fff5 27%,transparent 40%,#0004 55%,#fff5 69%,transparent 85%,#0002)',
              }}
            />
          )}
          {kind === 'slide' && (
            <div className="absolute inset-y-[18%] left-[7%] flex w-[60%] flex-col justify-center rounded-lg bg-white/90 p-4 text-slate-900">
              <h3 className="text-xl font-bold">
                {en ? 'Your headline' : 'ここにタイトル'}
              </h3>
              <p className="mt-2 text-xs">
                {en
                  ? 'See how the pattern supports your message.'
                  : '背景と文字のバランスを確認'}
              </p>
            </div>
          )}
          {kind === 'stream' && (
            <>
              <div className="absolute top-[10%] left-[6%] flex h-[65%] w-[60%] items-center justify-center rounded-lg border-2 border-white bg-slate-950/85 text-sm text-white">
                {en ? 'Content' : '配信コンテンツ'}
              </div>
              <div className="absolute right-[5%] bottom-[12%] flex h-[35%] w-[25%] items-center justify-center rounded-lg border-2 border-white bg-slate-900/90 text-xs text-white">
                {en ? 'Camera' : 'カメラ'}
              </div>
              <span className="absolute bottom-[4%] left-[6%] rounded bg-black/75 px-3 py-1 text-xs text-white">
                LIVE
              </span>
            </>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {en
          ? 'Illustrative preview only. Frames, shadows and sample text are not exported. This is not a print color proof or a fabric repeat inspection; use the repeat preview and seam check for production.'
          : '使用場面を想定した簡易プレビューです。枠・影・仮の文字は書き出されません。印刷の色校正や布の継ぎ目検査ではありません。実制作前にリピート表示と継ぎ目検査を確認してください。'}
      </p>
    </section>
  );
}
