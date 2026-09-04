'use client';

import { Lock, Unlock } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import type { RandomLocks } from '@/lib/random-locks';

export function RandomLockControls({
  value,
  locale,
  onChange,
}: {
  value: RandomLocks;
  locale: Locale;
  onChange: (next: RandomLocks) => void;
}) {
  const labels =
    locale === 'en'
      ? { palette: 'Color', shape: 'Shape', placement: 'Layout' }
      : { palette: '色', shape: '形', placement: '配置' };
  return (
    <fieldset className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
      <legend className="px-1 text-xs font-semibold">
        {locale === 'en' ? 'Keep when generating' : 'おまかせで固定する'}
      </legend>
      <div className="grid grid-cols-3 gap-1.5">
        {(['palette', 'shape', 'placement'] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={value[key]}
            onClick={() => onChange({ ...value, [key]: !value[key] })}
            className={`flex min-h-10 items-center justify-center gap-1 rounded-lg border px-2 text-xs font-semibold ${value[key] ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background'}`}
          >
            {value[key] ? (
              <Lock className="size-3.5" />
            ) : (
              <Unlock className="size-3.5" />
            )}
            {labels[key]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
