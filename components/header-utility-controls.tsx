'use client';

import { CircleHelp, Moon, Newspaper, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const COPY = {
  ja: {
    groupLabel: '更新情報、表示テーマ、ヘルプ',
    whatsNew: '更新情報',
    whatsNewDescription: 'KIKAMOYOの最近の変更を確認できます。',
    releaseDate: '2026年9月26日',
    releaseHeading: '今回の更新',
    changes: [
      'ヘッダーからライトモードとダークモードを切り替えられるようになりました。',
      '更新情報とヘルプをいつでも確認できるようになりました。',
      'プリセットとパターンの表示を、より迷いにくく整理しました。',
    ],
    darkMode: 'ダークモード',
    lightMode: 'ライトモード',
    switchToDark: 'ダークモードに切り替える',
    switchToLight: 'ライトモードに切り替える',
    help: 'ヘルプ',
    helpDescription: '模様を作って保存するまでの基本操作です。',
    helpSteps: [
      '「見本」から、好みの模様を選びます。',
      '色・かたち・配置を調整して、プレビューで仕上がりを確認します。',
      '右上の「書き出し」から、必要な形式で保存します。',
    ],
    keyboardHeading: 'キーボードでの操作',
    keyboardHelp:
      'Tabキーで操作項目を移動できます。ダイアログはEscキーで閉じられます。',
    storageHeading: '設定の保存',
    storageHelp: '表示テーマや言語などの設定は、このブラウザーに保存されます。',
    cloudStorageHelp:
      '表示テーマや言語などの設定はこのブラウザーに保存され、プロジェクトは端末保存または非公開同期を利用できます。',
    close: '閉じる',
  },
  en: {
    groupLabel: 'Updates, display theme, and help',
    whatsNew: "What's new",
    whatsNewDescription: 'See the latest changes to KIKAMOYO.',
    releaseDate: 'September 26, 2026',
    releaseHeading: 'Latest update',
    changes: [
      'You can now switch between light and dark mode from the header.',
      'Updates and Help are now available whenever you need them.',
      'Preset and pattern views have been reorganized for easier navigation.',
    ],
    darkMode: 'Dark mode',
    lightMode: 'Light mode',
    switchToDark: 'Switch to dark mode',
    switchToLight: 'Switch to light mode',
    help: 'Help',
    helpDescription: 'The basics of creating and saving a pattern.',
    helpSteps: [
      'Choose a pattern you like from Presets.',
      'Adjust its colors, shapes, and layout, then check the preview.',
      'Use Export in the upper-right corner to save it in the format you need.',
    ],
    keyboardHeading: 'Keyboard controls',
    keyboardHelp:
      'Press Tab to move through controls. Press Escape to close a dialog.',
    storageHeading: 'Saved settings',
    storageHelp:
      'Your display theme, language, and other preferences are saved in this browser.',
    cloudStorageHelp:
      'Display preferences are saved in this browser, while projects can be kept on this device or synced privately.',
    close: 'Close',
  },
} as const;

export interface HeaderUtilityControlsProps {
  locale: Locale;
  darkMode: boolean;
  cloudEnabled: boolean;
  onDarkModeChange: (darkMode: boolean) => void;
  className?: string;
}

export function HeaderUtilityControls({
  locale,
  darkMode,
  cloudEnabled,
  onDarkModeChange,
  className,
}: HeaderUtilityControlsProps) {
  const copy = COPY[locale];
  const themeTitle = darkMode ? copy.switchToLight : copy.switchToDark;

  return (
    <fieldset
      className={cn(
        'm-0 flex min-w-0 shrink-0 items-center gap-1 border-0 p-0',
        className,
      )}
    >
      <legend className="sr-only">{copy.groupLabel}</legend>
      <Dialog>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mobile-touch xl:w-auto xl:px-2"
              aria-label={copy.whatsNew}
              title={copy.whatsNew}
            />
          }
        >
          <Newspaper data-icon="inline-start" aria-hidden="true" />
          <span className="hidden xl:inline">{copy.whatsNew}</span>
        </DialogTrigger>
        <DialogContent
          closeLabel={copy.close}
          className="max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Newspaper className="size-5 text-primary" aria-hidden="true" />
              {copy.whatsNew}
            </DialogTitle>
            <DialogDescription>{copy.whatsNewDescription}</DialogDescription>
          </DialogHeader>
          <article className="space-y-3 rounded-xl border bg-muted/30 p-4">
            <header className="space-y-1">
              <h3 className="font-semibold">{copy.releaseHeading}</h3>
              <p className="text-xs text-muted-foreground">
                <time dateTime="2026-09-26">{copy.releaseDate}</time>
              </p>
            </header>
            <ul className="list-disc space-y-2 pl-5 leading-relaxed">
              {copy.changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </article>
        </DialogContent>
      </Dialog>

      <Button
        type="button"
        variant={darkMode ? 'secondary' : 'ghost'}
        size="icon-sm"
        className="mobile-touch xl:w-auto xl:px-2"
        aria-label={themeTitle}
        aria-pressed={darkMode}
        title={themeTitle}
        onClick={() => onDarkModeChange(!darkMode)}
      >
        {darkMode ? (
          <Sun data-icon="inline-start" aria-hidden="true" />
        ) : (
          <Moon data-icon="inline-start" aria-hidden="true" />
        )}
        <span className="hidden xl:inline">
          {darkMode ? copy.lightMode : copy.darkMode}
        </span>
      </Button>

      <Dialog>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mobile-touch xl:w-auto xl:px-2"
              aria-label={copy.help}
              title={copy.help}
            />
          }
        >
          <CircleHelp data-icon="inline-start" aria-hidden="true" />
          <span className="hidden xl:inline">{copy.help}</span>
        </DialogTrigger>
        <DialogContent
          closeLabel={copy.close}
          className="max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleHelp className="size-5 text-primary" aria-hidden="true" />
              {copy.help}
            </DialogTitle>
            <DialogDescription>{copy.helpDescription}</DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-2 pl-5 leading-relaxed">
            {copy.helpSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="grid gap-3 sm:grid-cols-2">
            <section className="rounded-xl border p-3">
              <h3 className="font-semibold">{copy.keyboardHeading}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {copy.keyboardHelp}
              </p>
            </section>
            <section className="rounded-xl border p-3">
              <h3 className="font-semibold">{copy.storageHeading}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {cloudEnabled ? copy.cloudStorageHelp : copy.storageHelp}
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </fieldset>
  );
}
