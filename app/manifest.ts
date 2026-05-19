import type { MetadataRoute } from 'next';

/**
 * Next.js convention file: anything that `default-exports` a function
 * returning MetadataRoute.Manifest is served at /manifest.webmanifest
 * with the correct Content-Type. Browsers find it via the <link
 * rel="manifest"> tag that Next adds automatically.
 *
 * Marks AURA as installable as a Progressive Web App on every modern
 * browser. Once installed, the operator gets a standalone window
 * (no browser chrome) and an OS dock/Start-menu entry. The local-
 * folder sync worker continues to run while the window is open.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AURA — Automated Urban Radio Audio',
    short_name: 'AURA',
    description:
      'AI-voiced news bulletins for radio stations. Search global news, generate emotional scripts, and ship broadcast-quality audio.',
    start_url: '/',
    display: 'standalone',
    background_color: '#06080F',
    theme_color: '#06080F',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    categories: ['news', 'productivity', 'utilities'],
    lang: 'en',
  };
}
