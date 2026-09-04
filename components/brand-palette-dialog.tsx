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

interface BrandPalette {
  id: string;
  name: string;
  background: string;
  colors: string[];
}
const KEY = 'kikamoyo.brand-palettes.v1';

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
  const en = locale === 'en';
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      try {
        const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
        if (Array.isArray(value))
          setItems(
            value
              .filter(
                (item): item is BrandPalette =>
                  Boolean(item) &&
                  typeof item === 'object' &&
                  typeof (item as BrandPalette).id === 'string' &&
                  typeof (item as BrandPalette).name === 'string' &&
                  Array.isArray((item as BrandPalette).colors),
              )
              .slice(0, 20),
          );
      } catch {
        setItems([]);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);
  function persist(next: BrandPalette[]) {
    setItems(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }
  function save() {
    const item = {
      id: crypto.randomUUID(),
      name: name.trim().slice(0, 80) || (en ? 'My palette' : 'マイパレット'),
      background: document.canvas.background,
      colors: [...document.palette],
    };
    persist([item, ...items].slice(0, 20));
    setName('');
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Palette />
        {en ? 'Brand colors' : 'ブランド色'}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
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
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder={en ? 'Palette name' : 'パレット名'}
          />
          <Button onClick={save}>
            <Plus />
            {en ? 'Save current' : '現在色を保存'}
          </Button>
        </div>
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
                onClick={() =>
                  persist(items.filter((value) => value.id !== item.id))
                }
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
