import { Button, Heading, Hr, Section, Text } from '@react-email/components';
import { EmailShell, EMAIL_COLORS } from '@/lib/email/components/email-shell';
import { resetPasswordStrings } from '@/lib/email/strings';
import type { Locale } from '@/i18n';

interface ResetPasswordEmailProps {
  radioName: string;
  locale: Locale;
  resetUrl: string;
}

export function ResetPasswordEmail({
  radioName,
  locale,
  resetUrl,
}: ResetPasswordEmailProps) {
  const s = resetPasswordStrings(locale);

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
        {s.body1}
      </Text>
      <Section style={{ marginTop: '24px' }}>
        <Button
          href={resetUrl}
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
      <Text
        style={{
          marginTop: '20px',
          color: EMAIL_COLORS.textMute,
          fontSize: '12px',
          lineHeight: '1.5',
        }}
      >
        {s.fallbackHint}
        <br />
        <span
          style={{
            color: EMAIL_COLORS.textDim,
            wordBreak: 'break-all',
            fontFamily: '"SF Mono", Menlo, Consolas, monospace',
          }}
        >
          {resetUrl}
        </span>
      </Text>
      <Hr style={{ marginTop: '32px', borderColor: EMAIL_COLORS.border }} />
      <Text
        style={{
          marginTop: '16px',
          color: EMAIL_COLORS.textMute,
          fontSize: '12px',
        }}
      >
        {s.ignoreHint}
      </Text>
    </EmailShell>
  );
}
