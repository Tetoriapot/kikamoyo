import type { NextConfig } from 'next';

const isGitHubPages = process.env.DEPLOY_TARGET === 'github-pages';
const basePath = isGitHubPages
  ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')
  : '';
const pagesAssetPrefix =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || basePath;

const nextConfig: NextConfig = isGitHubPages
  ? {
      output: 'export',
      // Vinext 1.0.0-beta.5 asks the prerender server for `/` even when a
      // basePath is configured, which makes the only page look like a 404 and
      // omits index.html. assetPrefix gives GitHub Pages the required asset
      // URLs while keeping the single exported route at the artifact root.
      // An absolute prefix also keeps Vinext's on-disk `_next` directory at
      // the artifact root instead of nesting it beneath the repository name.
      assetPrefix: pagesAssetPrefix,
      trailingSlash: true,
    }
  : {};

export default nextConfig;
