'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Download, FileImage, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PatternCanvas } from '@/lib/pattern-engine';
import { downloadRaster, downloadSvg } from '@/lib/export-pattern';
import { CANVAS_SIZES, cloneDocument, type EditorDocument } from '@/lib/pattern-types';

export function ExportDialog({ document, name }: { document: EditorDocument; name: string }) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<'png' | 'svg' | 'jpg' | 'webp'>('png');
  const [width, setWidth] = useState(document.canvas.width);
  const [height, setHeight] = useState(document.canvas.height);
  const [widthDraft, setWidthDraft] = useState(String(document.canvas.width));
  const [heightDraft, setHeightDraft] = useState(String(document.canvas.height));
  const [scale, setScale] = useState(1);
  const [transparent, setTransparent] = useState(document.canvas.transparent);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const exportDocument = useMemo(() => {
    const next = cloneDocument(document);
    next.canvas.width = width;
    next.canvas.height = height;
    next.canvas.transparent = transparent;
    return next;
  }, [document, height, transparent, width]);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      const nextWidth = document.canvas.width;
      const nextHeight = document.canvas.height;
      setWidth(nextWidth);
      setHeight(nextHeight);
      setWidthDraft(String(nextWidth));
      setHeightDraft(String(nextHeight));
      setTransparent(document.canvas.transparent);
      setMessage('');
    }
    setOpen(nextOpen);
  }

  function commitDimension(dimension: 'width' | 'height') {
    const draft = dimension === 'width' ? widthDraft : heightDraft;
    const current = dimension === 'width' ? width : height;
    const parsed = Number(draft);
    const next = draft.trim() && Number.isFinite(parsed)
      ? Math.min(16384, Math.max(64, Math.round(parsed)))
      : current;

    if (dimension === 'width') {
      setWidth(next);
      setWidthDraft(String(next));
    } else {
      setHeight(next);
      setHeightDraft(String(next));
    }
  }

  function chooseSize(value: string | null) {
    if (!value) return;
    const selected = CANVAS_SIZES[Number(value)];
    if (!selected) return;
    setWidth(selected[1]);
    setHeight(selected[2]);
    setWidthDraft(String(selected[1]));
    setHeightDraft(String(selected[2]));
  }

  async function download() {
    setBusy(true);
    setMessage('');
    try {
      if (format === 'svg') {
        downloadSvg({ elementId: 'export-pattern-canvas', width, height, transparent, background: document.canvas.background, name });
      } else {
        await downloadRaster({ elementId: 'export-pattern-canvas', width, height, scale, transparent, background: document.canvas.background, name, format });
      }
      setMessage('ダウンロードを開始しました。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '書き出しに失敗しました。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {open && <div className="export-source" aria-hidden="true">
        <PatternCanvas id="export-pattern-canvas" document={exportDocument} maxObjects={5000} />
      </div>}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger render={<Button className="ml-1 px-3" />}>
          <Download data-icon="inline-start" />書き出し
        </DialogTrigger>
        <DialogContent className="max-w-lg p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-lg"><FileImage className="size-5 text-primary" />画像を書き出す</DialogTitle>
            <DialogDescription>用途に合わせて形式・サイズ・倍率を選べます。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 px-5 py-1">
            <div className="grid grid-cols-[104px_1fr] items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground">形式</span>
              <fieldset className="grid min-w-0 grid-cols-4 gap-1.5 border-0 p-0">
                <legend className="sr-only">出力形式</legend>
                {(['png', 'svg', 'jpg', 'webp'] as const).map((value) => <button key={value} type="button" aria-pressed={format === value} onClick={() => setFormat(value)} className={`rounded-lg border px-2 py-2 text-xs font-bold uppercase transition ${format === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted'}`}>{value}</button>)}
              </fieldset>
            </div>
            <div className="grid grid-cols-[104px_1fr] items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground">サイズ</span>
              <Select onValueChange={chooseSize}>
                <SelectTrigger className="w-full" aria-label="出力サイズ"><SelectValue placeholder={`${width} × ${height}`} /></SelectTrigger>
                <SelectContent>{CANVAS_SIZES.map((size, index) => <SelectItem key={size[0]} value={String(index)}>{size[0]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[104px_1fr] items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground">カスタム</span>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2"><Input aria-label="出力幅" type="number" min={64} max={16384} value={widthDraft} onChange={(event) => setWidthDraft(event.target.value)} onBlur={() => commitDimension('width')} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commitDimension('width'); } }} /><span className="text-muted-foreground">×</span><Input aria-label="出力高さ" type="number" min={64} max={16384} value={heightDraft} onChange={(event) => setHeightDraft(event.target.value)} onBlur={() => commitDimension('height')} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commitDimension('height'); } }} /></div>
            </div>
            {format !== 'svg' && <div className="grid grid-cols-[104px_1fr] items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground">倍率</span>
              <fieldset className="flex min-w-0 gap-1.5 border-0 p-0"><legend className="sr-only">出力倍率</legend>{[1, 2, 4].map((value) => <button key={value} type="button" aria-pressed={scale === value} onClick={() => setScale(value)} className={`min-w-16 rounded-lg border px-3 py-2 text-xs font-semibold ${scale === value ? 'border-primary bg-accent text-accent-foreground' : 'border-border'}`}>{value}x</button>)}</fieldset>
            </div>}
            <div className="grid grid-cols-[104px_1fr] items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground">背景</span>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/35 px-3 py-2.5 text-xs"><span>{transparent ? '透明' : '背景色あり'}</span><Switch checked={transparent} onCheckedChange={setTransparent} aria-label="背景を透明にする" /></div>
            </div>
            <div className="rounded-lg bg-muted/55 px-3 py-2 text-[11px] text-muted-foreground">出力: {width * (format === 'svg' ? 1 : scale)} × {height * (format === 'svg' ? 1 : scale)} px{format === 'svg' ? '（編集可能なベクター）' : ''}</div>
            <p className="min-h-4 text-xs text-muted-foreground" aria-live="polite">{message && <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5" />{message}</span>}</p>
          </div>
          <DialogFooter className="mx-0 mb-0 px-5 py-4">
            <Button onClick={download} disabled={busy} className="min-w-32">{busy ? <Loader2 className="animate-spin" /> : <Download />}ダウンロード</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
