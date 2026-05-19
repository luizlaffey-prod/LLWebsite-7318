import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 192, height: 192 };
export const contentType = 'image/png';

/**
 * 192px AURA broadcast tile, rendered via @vercel/og. Used as the
 * favicon AND as the PWA manifest icon — Chrome's install criteria
 * require a PNG ≥192px, and ImageResponse generates one at build
 * time with no native deps (no sharp install needed).
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0F2D2A',
          borderRadius: 38,
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="1.6" fill="#00E5C8" />
          <path
            d="M8.4 8.4a5.1 5.1 0 0 0 0 7.2"
            stroke="#00E5C8"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M5.7 5.7a8.9 8.9 0 0 0 0 12.6"
            stroke="#00E5C8"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M15.6 8.4a5.1 5.1 0 0 1 0 7.2"
            stroke="#00E5C8"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M18.3 5.7a8.9 8.9 0 0 1 0 12.6"
            stroke="#00E5C8"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
