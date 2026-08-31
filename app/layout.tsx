import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KIKAMOYO — 幾何学模様を、3秒で。',
  description: 'プリセットを選び、色や形を少し調整して、シームレスな幾何学模様をPNG・SVGで保存できるブラウザツール。',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'KIKAMOYO — 幾何学模様を、3秒で。',
    description: '100種のプリセットからシームレスな幾何学模様を作り、PNG・SVGで保存。',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'KIKAMOYO 幾何学模様ジェネレーター' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KIKAMOYO — 幾何学模様を、3秒で。',
    description: '100種のプリセットからシームレスな幾何学模様を作り、PNG・SVGで保存。',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
