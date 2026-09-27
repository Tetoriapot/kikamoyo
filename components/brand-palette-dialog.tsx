'use client';

import { useEffect, useState } from 'react';
import { Palette, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { EditorDocument } from '@/lib/pattern-types';
import type { Locale } from '@/lib/i18n';
import type { BrandPalette } from '@/lib/brand-palettes';
import { readBrandPalettes, writeBrandPalettes } from '@/lib/project-codec';

export function BrandPaletteDialog({
  document,
  locale,
  onApply,
}: {
  document: EditorDocument;
  locale: Locale;
  onApply: (background: string, colors: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [items, setItems] = useState<BrandPalette[]>([]);
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  const en = locale === 'en';
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      try {
        setItems(readBrandPalettes());
        setReady(true);
        setMessage('');
      } catch {
        setReady(false);
        setMessage(
          en
            ? 'Cannot read saved colors. Existing data is kept.'
            : '保存色を読み込めません。既存データは保持しています。',
        );
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, en]);
  function persist(next: BrandPalette[]) {
    try {
      writeBrandPalettes(next);
      setItems(next);
      setMessage(en ? 'Saved.' : '保存しました。');
      return true;
    } catch {
      setMessage(
        en
          ? 'Save failed. Check storage and the 20-palette limit.'
          : '保存できません。容量と20配色の上限を確認してください。',
      );
      return false;
    }
  }
  function save() {
    const item = {
      id: crypto.randomUUID(),
      name: name.trim().slice(0, 80) || (en ? 'My palette' : 'マイパレット'),
      background: document.canvas.background,
      colors: [...document.palette],
    };
    if (persist([item, ...items])) setName('');
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Palette />
        {en ? 'Brand colors' : 'ブランド色'}
      </DialogTrigger>
      <DialogContent closeLabel={en ? 'Close' : '閉じる'} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {en ? 'Brand palettes' : 'ブランドパレット'}
          </DialogTitle>
          <DialogDescription>
            {en
              ? 'Reuse approved colors without changing saved artwork.'
              : '承認済みの色を保存し、作品へコピーして再利用できます。'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            aria-label={en ? 'Palette name' : 'パレット名'}
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder={en ? 'Palette name' : 'パレット名'}
          />
          <Button onClick={save} disabled={!ready || items.length >= 20}>
            <Plus />
            {en ? 'Save current' : '現在色を保存'}
          </Button>
        </div>
        <p className="text-xs">
          {items.length}/20{' '}
          {en
            ? 'palettes · Included in the Projects library backup.'
            : '配色 · プロジェクトのライブラリバックアップに含まれます。'}
        </p>
        <output className="block text-sm">{message}</output>
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-xl border p-2"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onApply(item.background, item.colors)}
              >
                <strong className="ui-label block truncate">{item.name}</strong>
                <span className="mt-1 flex overflow-hidden rounded-full">
                  {[item.background, ...item.colors].map((color, index) => (
                    <span
                      key={`${color}-${index}`}
                      className="h-3 flex-1"
                      style={{ background: color }}
                    />
                  ))}
                </span>
              </button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={en ? `Delete ${item.name}` : `${item.name}を削除`}
                onClick={() => {
                  if (
                    window.confirm(
                      en
                        ? `Delete palette “${item.name}”? Export a library backup first if you need it.`
                        : `「${item.name}」を削除しますか？残したい場合は先にライブラリをバックアップしてください。`,
                    )
                  )
                    persist(items.filter((value) => value.id !== item.id));
                }}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
        {!items.length && (
          <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
            {en
              ? 'No brand palettes yet.'
              : 'まだブランドパレットはありません。'}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
