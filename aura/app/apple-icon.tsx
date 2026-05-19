import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/**
 * 180px Apple touch icon — what iOS uses when the user adds the PWA
 * to their home screen. Slightly larger ratio than the regular
 * favicon and Apple ignores rounded corners (it applies its own
 * mask), so the inner illustration is centred without the bg radius.
 */
export default function AppleIcon() {
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
          <path d="M8.4 8.4a5.1 5.1 0 0 0 0 7.2" stroke="#00E5C8" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M5.7 5.7a8.9 8.9 0 0 0 0 12.6" stroke="#00E5C8" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M15.6 8.4a5.1 5.1 0 0 1 0 7.2" stroke="#00E5C8" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M18.3 5.7a8.9 8.9 0 0 1 0 12.6" stroke="#00E5C8" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
