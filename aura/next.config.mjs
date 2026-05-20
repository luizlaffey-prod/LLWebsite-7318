import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Keep @ffmpeg-installer out of the webpack bundle and let the Node
  // runtime require() it normally. The package's index.js relies on
  // __dirname to locate the platform-specific binary, but webpack
  // rewrites __dirname during bundling, so the resolved path ends up
  // pointing at a virtual location inside the function archive instead
  // of node_modules. Marking it external sidesteps the rewrite entirely
  // and is the recommended Next 15 fix (the "Critical dependency"
  // warning at build time was the symptom).
  serverExternalPackages: [
    '@ffmpeg-installer/ffmpeg',
    '@ffmpeg-installer/linux-x64',
    '@ffmpeg-installer/darwin-arm64',
    '@ffmpeg-installer/darwin-x64',
  ],
  // Belt-and-suspenders: also instruct outputFileTracing to ship the
  // platform binary alongside each Node route that needs it. Without
  // this, a "successful" build can still 500 at runtime because Vercel
  // strips files it thinks are unused. Every route that imports
  // lib/audio/server-mix directly OR transitively (via lib/tts/
  // elevenlabs's concatMp3Bytes) must appear here. Moved out of
  // experimental for Next 15 (the experimental.* form is silently
  // ignored now and emitted a warning the user already saw).
  outputFileTracingIncludes: {
    '/api/cron/automations': ['./node_modules/@ffmpeg-installer/**/*'],
    '/api/automations/[id]/run': ['./node_modules/@ffmpeg-installer/**/*'],
    '/api/automations/[id]/runs/[runId]/retry': [
      './node_modules/@ffmpeg-installer/**/*',
    ],
    '/api/bulletin/generate': ['./node_modules/@ffmpeg-installer/**/*'],
    '/api/bulletin/regenerate': ['./node_modules/@ffmpeg-installer/**/*'],
    '/api/audios/[id]/download.wav': [
      './node_modules/@ffmpeg-installer/**/*',
    ],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '**.r2.dev' },
    ],
  },
};

export default withNextIntl(nextConfig);
