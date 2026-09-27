'use client';

import { useState } from 'react';
import { Columns2, Pin, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PatternCanvas } from '@/lib/pattern-engine';
import {
  cloneSnapshot,
  type CanvasConfig,
  type EditorSnapshot,
} from '@/lib/pattern-types';
import type { Locale } from '@/lib/i18n';
import { ReferencePalettePanel } from '@/components/reference-palette-panel';
import { MockupPanel } from '@/components/mockup-panel';

export function StudioToolsDialog({
  snapshot,
  locale,
  onCanvas,
  onLoad,
  onPalette,
}: {
  snapshot: EditorSnapshot;
  locale: Locale;
  onCanvas: (patch: Partial<CanvasConfig>) => void;
  onLoad: (snapshot: EditorSnapshot, name: string) => void;
  onPalette: (background: string, colors: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'space' | 'compare' | 'reference' | 'mockup'>(
    'space',
  );
  const [candidates, setCandidates] = useState<
    { id: string; snapshot: EditorSnapshot }[]
  >([]);
  const [message, setMessage] = useState('');
  const en = locale === 'en';
  const space = snapshot.document.canvas.textSpace;
  function pin() {
    if (candidates.length >= 4) return;
    setCandidates([
      ...candidates,
      { id: crypto.randomUUID(), snapshot: cloneSnapshot(snapshot) },
    ]);
    setMessage(
      en
        ? 'Pinned. Close this panel, edit or load a history item, then pin the next candidate.'
        : '候補に固定しました。一度閉じて、編集や履歴・お気に入りから次の案を選び、もう一度固定できます。',
    );
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="w-full" />}>
        <Columns2 />
        {en ? 'Studio tools' : '制作ツール（余白・比較など）'}
      </DialogTrigger>
      <DialogContent
        closeLabel={en ? 'Close' : '閉じる'}
        className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl"
      >
        <DialogHeader>
          <DialogTitle>{en ? 'Studio tools' : '制作ツール'}</DialogTitle>
          <DialogDescription>
            {en
              ? 'Refine a single-layer design and compare candidates.'
              : 'レイヤーを増やさず構図を整え、候補を比較できます。'}
          </DialogDescription>
        </DialogHeader>
        <div
          className="flex flex-wrap gap-2"
          aria-label={en ? 'Tools' : 'ツール'}
        >
          {(['space', 'compare', 'reference', 'mockup'] as const).map(
            (value, index) => (
              <Button
                key={value}
                variant={tab === value ? 'secondary' : 'outline'}
                aria-pressed={tab === value}
                onClick={() => {
                  setTab(value);
                  setMessage('');
                }}
              >
                {
                  (en
                    ? [
                        'Text space',
                        'Compare candidates',
                        'Reference colors',
                        'Mockups',
                      ]
                    : [
                        '文字用の余白',
                        '候補の比較',
                        '参考画像の配色',
                        '使用イメージ',
                      ])[index]
                }
              </Button>
            ),
          )}
        </div>
        {tab === 'reference' && (
          <ReferencePalettePanel locale={locale} onApply={onPalette} />
        )}
        {tab === 'mockup' && (
          <MockupPanel document={snapshot.document} locale={locale} />
        )}
        {tab === 'space' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <PatternCanvas
              document={snapshot.document}
              className="checker max-h-80 w-full rounded-xl border"
            />
            <div className="space-y-4">
              <label className="block text-sm">
                {en ? 'Space position' : '余白の位置'}
                <select
                  value={space?.position ?? 'none'}
                  onChange={(event) =>
                    onCanvas({
                      textSpace:
                        event.target.value === 'none'
                          ? undefined
                          : {
                              position: event.target.value as NonNullable<
                                CanvasConfig['textSpace']
                              >['position'],
                              width: space?.width ?? 0.4,
                            },
                    })
                  }
                  className="mt-2 w-full rounded-lg border bg-background p-2"
                >
                  {['none', 'left', 'center', 'right'].map((value, index) => (
                    <option value={value} key={value}>
                      {
                        (en
                          ? ['None', 'Left', 'Center', 'Right']
                          : ['なし', '左', '中央', '右'])[index]
                      }
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                {en ? 'Space width' : '余白の幅'}:{' '}
                {Math.round((space?.width ?? 0.4) * 100)}%
                <input
                  className="mt-2 w-full"
                  type="range"
                  min={20}
                  max={70}
                  step={5}
                  disabled={!space}
                  value={Math.round((space?.width ?? 0.4) * 100)}
                  onChange={(event) =>
                    space &&
                    onCanvas({
                      textSpace: {
                        ...space,
                        width: Number(event.target.value) / 100,
                      },
                    })
                  }
                />
              </label>
              <p className="text-sm text-muted-foreground">
                {en
                  ? 'Patterns fade out here. Unlike the safe-area guide, this space is exported. Enabling space turns off seamless repeat; enabling repeat clears the space.'
                  : '指定範囲の模様を消し、境界をなだらかにします。安全域ガイドと異なり、余白は書き出されます。余白を有効にするとシームレスはオフになり、リピートを有効にすると余白は解除されます。'}
              </p>
            </div>
          </div>
        )}
        {tab === 'compare' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={pin} disabled={candidates.length >= 4}>
                <Pin />
                {en ? 'Pin current design' : '現在の案を固定'} (
                {candidates.length}/4)
              </Button>
              <p className="text-xs text-muted-foreground">
                {en
                  ? 'Temporary candidates for this session. Save chosen work in Projects.'
                  : 'ページを閉じると候補は消えます。残したい作品はプロジェクトに保存してください。'}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {candidates.map((candidate, index) => (
                <article
                  className="space-y-2 rounded-xl border p-3"
                  key={candidate.id}
                >
                  <h3 className="text-sm font-semibold">
                    {en ? 'Candidate' : '候補'} {index + 1}:{' '}
                    {candidate.snapshot.presetName}
                  </h3>
                  <PatternCanvas
                    document={candidate.snapshot.document}
                    className="checker h-52 w-full"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        onLoad(
                          cloneSnapshot(candidate.snapshot),
                          candidate.snapshot.presetName,
                        );
                        setOpen(false);
                      }}
                    >
                      {en ? 'Use this design' : 'この案を採用'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={
                        en
                          ? `Remove candidate ${index + 1}`
                          : `候補${index + 1}を外す`
                      }
                      onClick={() =>
                        setCandidates(
                          candidates.filter((item) => item.id !== candidate.id),
                        )
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
            {candidates.length < 2 && (
              <p className="text-sm">
                {en
                  ? 'Pin two to four designs to compare colors and composition side by side.'
                  : '2〜4枚を固定すると、色や構図を並べて比較できます。'}
              </p>
            )}
          </div>
        )}
        <output className="block text-sm text-muted-foreground">
          {message}
        </output>
      </DialogContent>
    </Dialog>
  );
}
