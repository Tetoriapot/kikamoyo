import type { Metadata, Viewport } from 'next';
import './globals.css';

const CARD_ALT =
  'KIKAMOYOのソーシャルカード。深い藍、コーラル、ティール、マスタードの幾何学模様と「幾何学模様を、3秒で。」の文字。';
const DEFAULT_SITE_URL = 'https://kikamoyo.tetoriapot.chatgpt.site';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');

function publicAsset(path: string) {
  return `${BASE_PATH}/${path.replace(/^\//, '')}`;
}

function absolutePublicAsset(path: string) {
  return new URL(publicAsset(path), new URL(SITE_URL).origin).toString();
}

export const viewport: Viewport = {
  themeColor: '#25283d',
  colorScheme: 'light dark',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'KIKAMOYO — 幾何学模様を、3秒で。',
  description:
    '117種のプリセットから幾何学模様を作成。版管理、シームレス、PNG・SVG・CSS・JSON・WebM書き出しに対応。',
  manifest: publicAsset('/manifest.webmanifest'),
  alternates: { canonical: SITE_URL },
  icons: {
    icon: [
      {
        url: publicAsset('/favicon.svg'),
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        url: publicAsset('/icon-192.png'),
        sizes: '192x192',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: publicAsset('/apple-touch-icon.png'),
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
  openGraph: {
    title: 'KIKAMOYO — 幾何学模様を、3秒で。',
    description:
      '117種のプリセットからシームレスな幾何学模様を作り、画像・CSS・JSON・WebMで保存。',
    type: 'website',
    url: SITE_URL,
    siteName: 'KIKAMOYO',
    locale: 'ja_JP',
    images: [
      {
        url: absolutePublicAsset('/og.png'),
        width: 1200,
        height: 630,
        alt: CARD_ALT,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KIKAMOYO — 幾何学模様を、3秒で。',
    description:
      '117種のプリセットからシームレスな幾何学模様を作り、画像・CSS・JSON・WebMで保存。',
    images: { url: absolutePublicAsset('/og.png'), alt: CARD_ALT },
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
