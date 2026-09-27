'use client';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { readReferenceColors } from '@/lib/reference-colors';
import type { Locale } from '@/lib/i18n';

export function ReferencePalettePanel({
  locale,
  onApply,
}: {
  locale: Locale;
  onApply: (background: string, colors: string[]) => void;
}) {
  const [colors, setColors] = useState<string[]>([]);
  const [background, setBackground] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const request = useRef(0);
  const en = locale === 'en';
  async function read(file: File) {
    const current = ++request.current;
    setBusy(true);
    setColors([]);
    setMessage('');
    try {
      const extracted = await readReferenceColors(file);
      if (current === request.current) {
        setColors(extracted);
        setBackground(0);
        setMessage(
          en
            ? 'Colors extracted. Choose the background, then apply.'
            : '配色を抽出しました。背景色を選び、適用してください。',
        );
      }
    } catch (error) {
      if (current === request.current)
        setMessage(
          error instanceof Error
            ? error.message
            : en
              ? 'Cannot read this image.'
              : '画像を読み込めません。',
        );
    } finally {
      if (current === request.current) setBusy(false);
    }
  }
  return (
    <section className="space-y-4">
      <p className="text-sm">
        {en
          ? 'Extract up to six colors from a reference. This changes colors only, keeps the current geometry and never adds a layer. Images stay on your device, are not uploaded, and are not included in saved projects.'
          : '参考画像から最大6色を抽出します。今の形・構図を保ったまま配色だけを変更し、レイヤーは追加しません。画像は端末内で処理し、外部送信や作品への保存は行いません。'}
      </p>
      <label className="block rounded-xl border border-dashed p-4 text-sm">
        {en
          ? 'Reference image (PNG / JPEG / WebP, up to 10 MB)'
          : '参考画像（PNG / JPEG / WebP、10MBまで）'}
        <input
          className="mt-3 block w-full"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void read(file);
            event.target.value = '';
          }}
        />
      </label>
      {colors.length > 0 && (
        <>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">
              {en ? 'Choose background color' : '背景に使う色を選択'}
            </legend>
            <div className="flex flex-wrap gap-2">
              {colors.map((color, index) => (
                <button
                  type="button"
                  className="rounded-lg border p-2 text-xs"
                  key={color}
                  aria-pressed={background === index}
                  onClick={() => setBackground(index)}
                >
                  <span
                    className="mb-2 block h-10 w-16 rounded"
                    style={{ background: color }}
                  />
                  {color}
                  {background === index ? ' ✓' : ''}
                </button>
              ))}
            </div>
          </fieldset>
          <Button
            onClick={() => {
              onApply(
                colors[background],
                colors.filter((_, index) => index !== background),
              );
              setMessage(
                en
                  ? 'Applied. Save these colors in Brand colors if needed.'
                  : '適用しました。再利用する場合は「ブランド色」で保存できます。',
              );
            }}
          >
            {en ? 'Apply extracted colors' : '抽出した配色を適用'}
          </Button>
        </>
      )}
      <output className="block text-sm">
        {busy ? (en ? 'Reading colors…' : '配色を読み取り中…') : message}
      </output>
    </section>
  );
}
