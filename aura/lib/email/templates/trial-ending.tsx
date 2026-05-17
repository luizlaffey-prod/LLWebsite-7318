import { Button, Heading, Hr, Section, Text } from '@react-email/components';
import { EmailShell, EMAIL_COLORS } from '@/lib/email/components/email-shell';
import { trialEndingStrings } from '@/lib/email/strings';
import type { Locale } from '@/i18n';

interface TrialEndingEmailProps {
  radioName: string;
  locale: Locale;
  upgradeUrl: string;
  manageUrl: string;
}

export function TrialEndingEmail({
  radioName,
  locale,
  upgradeUrl,
  manageUrl,
}: TrialEndingEmailProps) {
  const s = trialEndingStrings(locale);

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
          color: EMAIL_COLORS.text,
          lineHeight: '1.6',
          fontWeight: 500,
        }}
      >
        {s.body1}
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
      <Text
        style={{
          marginTop: '12px',
          color: EMAIL_COLORS.textDim,
          lineHeight: '1.6',
        }}
      >
        {s.body3}
      </Text>
      <Section style={{ marginTop: '32px' }}>
        <Button
          href={upgradeUrl}
          style={{
            backgroundImage:
              'linear-gradient(135deg, #00E5C8 0%, #8B5CF6 100%)',
            color: '#06080F',
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-block',
            marginRight: '8px',
          }}
        >
          {s.ctaUpgrade}
        </Button>
        <Button
          href={manageUrl}
          style={{
            backgroundColor: '#141820',
            color: EMAIL_COLORS.text,
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: 500,
            textDecoration: 'none',
            display: 'inline-block',
            border: `1px solid ${EMAIL_COLORS.border}`,
          }}
        >
          {s.ctaManage}
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
