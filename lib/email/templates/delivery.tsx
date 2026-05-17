import { Button, Heading, Section, Text } from '@react-email/components';
import { EmailShell, EMAIL_COLORS } from '@/lib/email/components/email-shell';
import type { Locale } from '@/i18n';

interface DeliveryEmailProps {
  title: string;
  filename: string;
  audioUrl: string;
  locale: Locale;
}

export function DeliveryEmail({
  title,
  filename,
  audioUrl,
  locale,
}: DeliveryEmailProps) {
  const t = strings(locale);

  return (
    <EmailShell preview={t.preview(title)} locale={locale}>
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
        {t.heading}
      </Heading>
      <Text
        style={{
          marginTop: '16px',
          color: EMAIL_COLORS.textDim,
          lineHeight: '1.6',
        }}
      >
        {t.lead}
      </Text>

      <Section
        style={{
          marginTop: '24px',
          padding: '20px',
          backgroundColor: '#0A0E16',
          borderRadius: '10px',
          border: `1px solid ${EMAIL_COLORS.border}`,
        }}
      >
        <Text
          style={{
            margin: 0,
            color: EMAIL_COLORS.textDim,
            fontSize: '11px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {t.bulletinLabel}
        </Text>
        <Text
          style={{
            margin: '6px 0 0 0',
            color: EMAIL_COLORS.text,
            fontSize: '16px',
            fontWeight: 600,
            lineHeight: '1.4',
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            margin: '10px 0 0 0',
            color: EMAIL_COLORS.textMute,
            fontSize: '12px',
            fontFamily:
              '"SF Mono", Menlo, Consolas, "Roboto Mono", monospace',
          }}
        >
          {filename}.mp3
        </Text>
      </Section>

      <Section style={{ marginTop: '24px' }}>
        <Button
          href={audioUrl}
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
          {t.cta}
        </Button>
      </Section>

      <Text
        style={{
          marginTop: '28px',
          color: EMAIL_COLORS.textMute,
          fontSize: '12px',
          lineHeight: '1.5',
        }}
      >
        {t.hint}
      </Text>
    </EmailShell>
  );
}

function strings(locale: Locale) {
  switch (locale) {
    case 'pt':
      return {
        preview: (title: string) => `Seu boletim "${title}" está pronto`,
        heading: 'Seu boletim está pronto',
        lead: 'A AURA acabou de gerar um boletim agendado e está disponível para download.',
        bulletinLabel: 'Boletim',
        cta: 'Baixar MP3',
        hint: 'O link funciona enquanto o arquivo estiver em "Meus Áudios" no AURA.',
      };
    case 'es':
      return {
        preview: (title: string) => `Tu boletín "${title}" está listo`,
        heading: 'Tu boletín está listo',
        lead: 'AURA acaba de generar un boletín programado y está disponible para descargar.',
        bulletinLabel: 'Boletín',
        cta: 'Descargar MP3',
        hint: 'El enlace funciona mientras el archivo esté en "Mis Audios" en AURA.',
      };
    default:
      return {
        preview: (title: string) => `Your bulletin "${title}" is ready`,
        heading: 'Your bulletin is ready',
        lead: 'AURA just generated a scheduled bulletin and it is ready for download.',
        bulletinLabel: 'Bulletin',
        cta: 'Download MP3',
        hint: 'The link works as long as the file is in "My Audios" in AURA.',
      };
  }
}
