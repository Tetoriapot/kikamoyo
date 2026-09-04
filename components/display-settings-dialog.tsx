'use client';

import { Languages, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import type { Locale } from '@/lib/i18n';

export interface DisplayPreferences {
  mode: 'simple' | 'detail';
  locale: Locale;
  textSize: 'normal' | 'large';
  darkMode: boolean;
  showSafeArea: boolean;
}

export function DisplaySettingsDialog({
  value,
  onChange,
}: {
  value: DisplayPreferences;
  onChange: (patch: Partial<DisplayPreferences>) => void;
}) {
  const en = value.locale === 'en';
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={en ? 'Display and language' : '表示と言語'}
          />
        }
      >
        <Settings2 />
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="size-5" />
            {en ? 'Display & language' : '表示と言語'}
          </DialogTitle>
          <DialogDescription>
            {en
              ? 'Adjust the editor without changing your artwork.'
              : '作品を変えずに、編集画面の見え方を調整します。'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="ui-label font-semibold">
              {en ? 'Editor mode' : '編集モード'}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(['simple', 'detail'] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={value.mode === mode ? 'secondary' : 'outline'}
                  aria-pressed={value.mode === mode}
                  onClick={() => onChange({ mode })}
                >
                  {mode === 'simple'
                    ? en
                      ? 'Easy'
                      : 'やさしい'
                    : en
                      ? 'Advanced'
                      : '詳細'}
                </Button>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="ui-label font-semibold">
              {en ? 'Language' : '言語'}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={value.locale === 'ja' ? 'secondary' : 'outline'}
                aria-pressed={value.locale === 'ja'}
                onClick={() => onChange({ locale: 'ja' })}
              >
                日本語
              </Button>
              <Button
                variant={value.locale === 'en' ? 'secondary' : 'outline'}
                aria-pressed={value.locale === 'en'}
                onClick={() => onChange({ locale: 'en' })}
              >
                English
              </Button>
            </div>
          </fieldset>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <span>
              <strong className="ui-label block">
                {en ? 'Larger text' : '大きめ文字'}
              </strong>
              <span className="ui-help text-muted-foreground">
                {en
                  ? 'Increases interface text by 12.5%.'
                  : '操作文字を約12.5%大きくします。'}
              </span>
            </span>
            <Switch
              checked={value.textSize === 'large'}
              onCheckedChange={(large) =>
                onChange({ textSize: large ? 'large' : 'normal' })
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <span>
              <strong className="ui-label block">
                {en ? 'Dark theme' : 'ダークテーマ'}
              </strong>
              <span className="ui-help text-muted-foreground">
                {en
                  ? 'Reduces glare around the preview.'
                  : 'プレビュー周辺のまぶしさを抑えます。'}
              </span>
            </span>
            <Switch
              checked={value.darkMode}
              onCheckedChange={(darkMode) => onChange({ darkMode })}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <span>
              <strong className="ui-label block">
                {en ? 'Safe-area guide' : '安全域ガイド'}
              </strong>
              <span className="ui-help text-muted-foreground">
                {en
                  ? 'Shows a guide for text and logos.'
                  : '文字やロゴを置く目安を表示します。'}
              </span>
            </span>
            <Switch
              checked={value.showSafeArea}
              onCheckedChange={(showSafeArea) => onChange({ showSafeArea })}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
