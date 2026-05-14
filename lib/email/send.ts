import { Resend } from 'resend';
import { render } from '@react-email/render';
import { WelcomeEmail } from './templates/welcome';
import { TrialEndingEmail } from './templates/trial-ending';
import { welcomeStrings, trialEndingStrings } from './strings';
import type { Locale } from '@/i18n';

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  return new Resend(key);
}

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? 'AURA <noreply@aura.app>';
}

export async function sendWelcomeEmail(input: {
  to: string;
  radioName: string;
  locale: Locale;
  trialDays: number;
}) {
  const resend = getResend();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const dashboardUrl = `${baseUrl}/${input.locale}/dashboard`;
  const s = welcomeStrings(input.locale);

  const html = await render(
    WelcomeEmail({
      radioName: input.radioName,
      trialDays: input.trialDays,
      locale: input.locale,
      dashboardUrl,
    })
  );

  return resend.emails.send({
    from: fromAddress(),
    to: input.to,
    subject: s.subject,
    html,
  });
}

export async function sendTrialEndingEmail(input: {
  to: string;
  radioName: string;
  locale: Locale;
}) {
  const resend = getResend();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const s = trialEndingStrings(input.locale);

  const html = await render(
    TrialEndingEmail({
      radioName: input.radioName,
      locale: input.locale,
      upgradeUrl: `${baseUrl}/${input.locale}/settings/billing`,
      manageUrl: `${baseUrl}/${input.locale}/settings/billing`,
    })
  );

  return resend.emails.send({
    from: fromAddress(),
    to: input.to,
    subject: s.subject,
    html,
  });
}
