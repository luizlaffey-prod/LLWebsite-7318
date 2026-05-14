import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { welcomeStrings } from '@/lib/email/strings';
import type { Locale } from '@/i18n';

interface WelcomeEmailProps {
  radioName: string;
  trialDays: number;
  locale: Locale;
  dashboardUrl: string;
}

export function WelcomeEmail({
  radioName,
  trialDays,
  locale,
  dashboardUrl,
}: WelcomeEmailProps) {
  const s = welcomeStrings(locale);

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{s.subject}</Preview>
      <Body
        style={{
          backgroundColor: '#06080F',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#E8EAF0',
          margin: 0,
          padding: '32px 0',
        }}
      >
        <Container
          style={{
            maxWidth: '560px',
            margin: '0 auto',
            backgroundColor: '#0D1017',
            borderRadius: '12px',
            border: '1px solid #1C2030',
            padding: '40px 32px',
          }}
        >
          <Heading
            as="h1"
            style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #00E5C8 0%, #8B5CF6 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            AURA
          </Heading>
          <Heading
            as="h2"
            style={{
              marginTop: '24px',
              fontSize: '22px',
              fontWeight: 600,
              color: '#E8EAF0',
            }}
          >
            {s.greeting(radioName)}
          </Heading>
          <Text
            style={{ marginTop: '16px', color: '#9CA3AF', lineHeight: '1.6' }}
          >
            {s.body1(trialDays)}
          </Text>
          <Text
            style={{ marginTop: '12px', color: '#9CA3AF', lineHeight: '1.6' }}
          >
            {s.body2}
          </Text>
          <Section style={{ marginTop: '32px' }}>
            <Button
              href={dashboardUrl}
              style={{
                backgroundImage:
                  'linear-gradient(135deg, #00E5C8 0%, #8B5CF6 100%)',
                color: '#06080F',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              {s.cta}
            </Button>
          </Section>
          <Hr style={{ marginTop: '32px', borderColor: '#1C2030' }} />
          <Text style={{ marginTop: '16px', color: '#9CA3AF' }}>
            {s.signoff}
          </Text>
          <Text style={{ marginTop: '8px', color: '#4B5263', fontSize: '12px' }}>
            {s.footer}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
