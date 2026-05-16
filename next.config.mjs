import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Bundle the ffmpeg binary (platform-specific) with any route that mixes
    // voice + background track server-side. Without this, Next's output
    // tracing skips the native binary and Vercel's serverless function
    // can't find it at runtime.
    outputFileTracingIncludes: {
      '/api/cron/automations': ['./node_modules/@ffmpeg-installer/**/*'],
      '/api/automations/[id]/run': ['./node_modules/@ffmpeg-installer/**/*'],
      '/api/automations/[id]/runs/[runId]/retry': [
        './node_modules/@ffmpeg-installer/**/*',
      ],
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '**.r2.dev' },
    ],
  },
};

export default withNextIntl(nextConfig);
