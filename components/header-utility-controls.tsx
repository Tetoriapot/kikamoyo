'use client';

import { useState } from 'react';
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
    releaseDate: '2026年9月27日',
    releaseHeading: '今回の更新',
    changes: [
      '保存上限の保護、ごみ箱、再編集用JSONとライブラリのバックアップを追加しました。',
      '文字用の余白、4案比較、参考画像からの配色、使用イメージを追加しました。',
      '一括出力のサイズ・配色と、動画のサイズ・方向・速度・長さを選べます。',
      'ヘッダーからライトモードとダークモードを切り替えられるようになりました。',
      '更新情報とヘルプをいつでも確認できるようになりました。',
      'プリセットは1レイヤーを基本にし、必要なデザインだけ複数レイヤーを使うようにしました。',
    ],
    darkMode: 'ダークモード',
    lightMode: 'ライトモード',
    switchToDark: 'ダークモードに切り替える',
    switchToLight: 'ライトモードに切り替える',
    help: 'ヘルプ',
    helpDescription: '模様を作って保存するまでの基本操作です。',
    helpSteps: [
      '「見本」から、好みの模様を選びます。',
      '色・かたち・配置を調整し、必要なときだけレイヤーを追加します。',
      '右上の「書き出し」から、必要な形式で保存します。',
    ],
    keyboardHeading: 'キーボードでの操作',
    keyboardHelp:
      'Tabキーで操作項目を移動できます。ダイアログはEscキーで閉じられます。',
    storageHeading: '設定の保存',
    storageHelp:
      '自動保存・プロジェクト・ブランド色はこのブラウザー内だけに保存されます。履歴やブラウザーのデータを消すと失われます。プロジェクトは20作品・各20版までで、上限を超えて古い作品を削除することはありません。大切な作品は再編集用JSONまたはライブラリのバックアップも保存してください。',
    cloudStorageHelp:
      '表示テーマや言語などの設定はこのブラウザーに保存され、プロジェクトは端末保存または非公開同期を利用できます。',
    close: '閉じる',
  },
  en: {
    groupLabel: 'Updates, display theme, and help',
    whatsNew: "What's new",
    whatsNewDescription: 'See the latest changes to KIKAMOYO.',
    releaseDate: 'September 27, 2026',
    releaseHeading: 'Latest update',
    changes: [
      'Protected save limits, trash recovery, editable JSON and library backups.',
      'Text space, four-way comparison, reference colors and mockup previews.',
      'Selectable batch sizes and colors, plus video size, direction, speed and duration.',
      'You can now switch between light and dark mode from the header.',
      'Updates and Help are now available whenever you need them.',
      'Presets now use one layer by default, with extra layers reserved for designs that need them.',
    ],
    darkMode: 'Dark mode',
    lightMode: 'Light mode',
    switchToDark: 'Switch to dark mode',
    switchToLight: 'Switch to light mode',
    help: 'Help',
    helpDescription: 'The basics of creating and saving a pattern.',
    helpSteps: [
      'Choose a pattern you like from Presets.',
      'Adjust colors, shapes, and layout, adding another layer only when needed.',
      'Use Export in the upper-right corner to save it in the format you need.',
    ],
    keyboardHeading: 'Keyboard controls',
    keyboardHelp:
      'Press Tab to move through controls. Press Escape to close a dialog.',
    storageHeading: 'Saved settings',
    storageHelp:
      'Autosave, projects and brand colors live only in this browser. Clearing browser data removes them. Up to 20 projects with 20 versions each are supported; older work is never silently removed. Keep editable JSON or a library backup for important work.',
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
  onNavigate?: (target: 'presets' | 'colors' | 'projects' | 'export') => void;
  className?: string;
}

export function HeaderUtilityControls({
  locale,
  darkMode,
  cloudEnabled,
  onDarkModeChange,
  onNavigate,
  className,
}: HeaderUtilityControlsProps) {
  const copy = COPY[locale];
  const [helpOpen, setHelpOpen] = useState(false);
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
                <time dateTime="2026-09-27">{copy.releaseDate}</time>
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

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
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
          {onNavigate && (
            <div className="flex flex-wrap gap-2">
              {(['presets', 'colors', 'projects', 'export'] as const).map(
                (target, index) => (
                  <Button
                    key={target}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setHelpOpen(false);
                      window.setTimeout(() => onNavigate(target), 150);
                    }}
                  >
                    {
                      (locale === 'en'
                        ? [
                            'Choose a preset',
                            'Edit colors',
                            'Projects & backups',
                            'Export',
                          ]
                        : [
                            '見本を選ぶ',
                            '色を調整する',
                            '保存・バックアップ',
                            '書き出す',
                          ])[index]
                    }
                  </Button>
                ),
              )}
            </div>
          )}
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
          <section className="rounded-xl border p-3 text-sm leading-relaxed">
            <h3 className="font-semibold">
              {locale === 'en'
                ? 'Sharing & usage rights'
                : '共有・生成画像の利用条件'}
            </h3>
            <p className="mt-2">
              {locale === 'en'
                ? 'Generated patterns may be used commercially without attribution. A share URL includes the design settings; anyone with the URL can view and edit a copy. It is not private storage or a revocable access link. Never include confidential names in it.'
                : '生成した模様は商用利用でき、クレジット表記は不要です。共有URLには作品設定が含まれ、URLを知る人は作品を閲覧し、コピーを編集できます。非公開保存や取り消し可能なアクセス権ではありません。機密情報を作品名に含めないでください。'}
            </p>
            <p className="mt-2">
              {locale === 'en'
                ? 'Rights to third-party reference images, logos and trademarks remain with their owners. You must have permission to use them. Reference images are processed locally for color extraction and are not uploaded or stored in project files.'
                : '第三者の参考画像・ロゴ・商標の権利は別扱いです。利用に必要な権利を確認してください。参考画像は端末内で配色を抽出するだけで、外部への送信やプロジェクトへの画像保存は行いません。'}
            </p>
          </section>
        </DialogContent>
      </Dialog>
    </fieldset>
  );
}
