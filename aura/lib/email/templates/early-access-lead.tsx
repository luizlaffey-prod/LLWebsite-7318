import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailShell, EMAIL_COLORS } from '@/lib/email/components/email-shell';
import type { EarlyAccessInput } from '@/lib/early-access/schema';

interface EarlyAccessLeadEmailProps {
  lead: EarlyAccessInput;
  submittedAt: string;
}

export function EarlyAccessLeadEmail({
  lead,
  submittedAt,
}: EarlyAccessLeadEmailProps) {
  const rows: Array<[string, string]> = [
    ['Name', lead.name],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['Radio station', lead.radioStation],
    ['City / state', lead.cityState],
    ['Website', lead.website || '—'],
    ['Plan', lead.plan],
    ['Language', lead.locale],
    ['Submitted at', submittedAt],
  ];

  return (
    <EmailShell
      preview={`New AURA Early Access lead — ${lead.radioStation}`}
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
        New Early Access lead
      </Heading>
      <Text
        style={{
          marginTop: '12px',
          color: EMAIL_COLORS.textDim,
          lineHeight: '1.6',
        }}
      >
        Reply directly to this email to reach the lead.
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
                    width: '130px',
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
                  }}
                >
                  {v}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
      {lead.notes ? (
        <>
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
            Notes
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
            {lead.notes}
          </Text>
        </>
      ) : null}
    </EmailShell>
  );
}
