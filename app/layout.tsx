import type { Metadata, Viewport } from 'next';
import './globals.css';

const CARD_ALT =
  'KIKAMOYOのソーシャルカード。深い藍、コーラル、ティール、マスタードの幾何学模様と「幾何学模様を、3秒で。」の文字。';

export const viewport: Viewport = {
  themeColor: '#25283d',
  colorScheme: 'light dark',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://kikamoyo.tetoriapot.chatgpt.site'),
  title: 'KIKAMOYO — 幾何学模様を、3秒で。',
  description:
    '117種のプリセットから幾何学模様を作成。版管理、シームレス、PNG・SVG・CSS・JSON・WebM書き出しに対応。',
  manifest: '/manifest.webmanifest',
  alternates: { canonical: '/' },
  icons: {
    icon: [
      { url: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'KIKAMOYO — 幾何学模様を、3秒で。',
    description:
      '117種のプリセットからシームレスな幾何学模様を作り、画像・CSS・JSON・WebMで保存。',
    type: 'website',
    url: 'https://kikamoyo.tetoriapot.chatgpt.site',
    siteName: 'KIKAMOYO',
    locale: 'ja_JP',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: CARD_ALT }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KIKAMOYO — 幾何学模様を、3秒で。',
    description:
      '117種のプリセットからシームレスな幾何学模様を作り、画像・CSS・JSON・WebMで保存。',
    images: { url: '/og.png', alt: CARD_ALT },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
