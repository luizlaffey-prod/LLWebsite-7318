import { Button, Heading, Hr, Section, Text } from '@react-email/components';
import { EmailShell, EMAIL_COLORS } from '@/lib/email/components/email-shell';
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
    <EmailShell preview={s.subject} locale={locale}>
      <Heading
        as="h2"
        style={{
          margin: 0,
          fontSize: '22px',
          fontWeight: 600,
          color: EMAIL_COLORS.text,
          lineHeight: '1.3',
        }}
      >
        {s.greeting(radioName)}
      </Heading>
      <Text
        style={{
          marginTop: '16px',
          color: EMAIL_COLORS.textDim,
          lineHeight: '1.6',
        }}
      >
        {s.body1(trialDays)}
      </Text>
      <Text
        style={{
          marginTop: '12px',
          color: EMAIL_COLORS.textDim,
          lineHeight: '1.6',
        }}
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
      <Hr style={{ marginTop: '32px', borderColor: EMAIL_COLORS.border }} />
      <Text style={{ marginTop: '16px', color: EMAIL_COLORS.textDim }}>
        {s.signoff}
      </Text>
      <Text
        style={{
          marginTop: '8px',
          color: EMAIL_COLORS.textMute,
          fontSize: '12px',
        }}
      >
        {s.footer}
      </Text>
    </EmailShell>
  );
}
