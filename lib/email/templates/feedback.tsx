import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailShell, EMAIL_COLORS } from '@/lib/email/components/email-shell';
import type { FeedbackCategory } from '@/lib/feedback/schema';

interface FeedbackEmailProps {
  category: FeedbackCategory;
  message: string;
  pageUrl?: string;
  user: {
    email: string;
    radioName?: string | null;
    name?: string | null;
    plan?: string | null;
  };
  submittedAt: string;
}

const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  bug: 'Bug report',
  suggestion: 'Suggestion',
  praise: 'Praise',
  other: 'Other',
};

export function FeedbackEmail({
  category,
  message,
  pageUrl,
  user,
  submittedAt,
}: FeedbackEmailProps) {
  const rows: Array<[string, string]> = [
    ['Category', CATEGORY_LABEL[category]],
    ['From', user.email],
    ['Radio station', user.radioName ?? '—'],
    ['Plan', user.plan ?? '—'],
    ['Page', pageUrl || '—'],
    ['Submitted at', submittedAt],
  ];

  return (
    <EmailShell
      preview={`AURA feedback (${CATEGORY_LABEL[category]}) from ${user.radioName ?? user.email}`}
      locale="en"
    >
      <Heading
        as="h2"
        style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: 600,
          color: EMAIL_COLORS.text,
          lineHeight: '1.3',
        }}
      >
        New feedback — {CATEGORY_LABEL[category]}
      </Heading>
      <Text
        style={{
          marginTop: '12px',
          color: EMAIL_COLORS.textDim,
          lineHeight: '1.6',
        }}
      >
        Reply directly to this email to reach the user.
      </Text>
      <Section style={{ marginTop: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td
                  style={{
                    padding: '6px 12px 6px 0',
                    color: EMAIL_COLORS.textMute,
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    verticalAlign: 'top',
                    width: '120px',
                  }}
                >
                  {k}
                </td>
                <td
                  style={{
                    padding: '6px 0',
                    color: EMAIL_COLORS.text,
                    fontSize: '14px',
                    verticalAlign: 'top',
                    wordBreak: 'break-word',
                  }}
                >
                  {v}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
      <Hr style={{ marginTop: '20px', borderColor: EMAIL_COLORS.border }} />
      <Text
        style={{
          marginTop: '16px',
          color: EMAIL_COLORS.textMute,
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        Message
      </Text>
      <Text
        style={{
          marginTop: '4px',
          color: EMAIL_COLORS.text,
          fontSize: '14px',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.6',
        }}
      >
        {message}
      </Text>
    </EmailShell>
  );
}
