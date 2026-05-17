import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type { ReactNode } from 'react';
import type { Locale } from '@/i18n';

/**
 * Shared shell for every AURA transactional email. Locks the visual
 * identity to match the app: near-black background, dark surface cards,
 * mint accent, and an icon-plus-wordmark header that mirrors what
 * recipients see when they sign in. Individual templates should focus
 * on copy — never reimplement the wrapper.
 */
const COLORS = {
  bg: '#06080F',
  surface: '#0D1017',
  border: '#1C2030',
  text: '#E8EAF0',
  textDim: '#9CA3AF',
  textMute: '#4B5263',
  mint: '#00E5C8',
  iconBoxBg: '#0F2D2A',
} as const;

// Broadcast/radio icon — a center dot with two pairs of concentric arcs.
// Inlined as an SVG and rendered through a base64 data URI so it survives
// every mainstream client (Gmail, Apple Mail, iOS, Outlook 2019+) without
// needing an external image host.
const HEADER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
  <rect width="40" height="40" rx="10" fill="${COLORS.iconBoxBg}"/>
  <circle cx="20" cy="20" r="2.2" fill="${COLORS.mint}"/>
  <path d="M14.5 14.5 A 7.8 7.8 0 0 0 14.5 25.5" stroke="${COLORS.mint}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <path d="M11.5 11.5 A 12 12 0 0 0 11.5 28.5" stroke="${COLORS.mint}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <path d="M25.5 14.5 A 7.8 7.8 0 0 1 25.5 25.5" stroke="${COLORS.mint}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <path d="M28.5 11.5 A 12 12 0 0 1 28.5 28.5" stroke="${COLORS.mint}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
</svg>`.trim();

const HEADER_LOGO_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(
  HEADER_SVG
).toString('base64')}`;

interface EmailShellProps {
  preview: string;
  locale: Locale;
  children: ReactNode;
}

export function EmailShell({ preview, locale, children }: EmailShellProps) {
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: COLORS.bg,
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          color: COLORS.text,
          margin: 0,
          padding: '32px 0',
        }}
      >
        <Container
          style={{
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          <Section
            style={{
              padding: '4px 8px 20px 8px',
            }}
          >
            <table
              role="presentation"
              cellSpacing={0}
              cellPadding={0}
              border={0}
              style={{ borderCollapse: 'collapse' }}
            >
              <tbody>
                <tr>
                  <td style={{ verticalAlign: 'middle', paddingRight: '12px' }}>
                    <Img
                      src={HEADER_LOGO_DATA_URI}
                      width={40}
                      height={40}
                      alt="AURA"
                      style={{ display: 'block', borderRadius: '10px' }}
                    />
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <Text
                      style={{
                        margin: 0,
                        fontSize: '20px',
                        fontWeight: 700,
                        color: COLORS.text,
                        letterSpacing: '-0.01em',
                        lineHeight: '1.2',
                      }}
                    >
                      AURA
                      <span
                        style={{
                          color: COLORS.textDim,
                          fontWeight: 500,
                          fontSize: '15px',
                        }}
                      >
                        {' '}— Automated Urban Radio Audio
                      </span>
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Container
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: '12px',
              border: `1px solid ${COLORS.border}`,
              padding: '36px 32px',
            }}
          >
            {children}
          </Container>

          <Section style={{ padding: '20px 8px 4px 8px' }}>
            <Text
              style={{
                margin: 0,
                color: COLORS.textMute,
                fontSize: '12px',
                lineHeight: '1.5',
              }}
            >
              You&apos;re receiving this because of activity on your AURA account.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const EMAIL_COLORS = COLORS;
