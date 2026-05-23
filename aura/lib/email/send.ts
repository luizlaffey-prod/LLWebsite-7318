import { Resend } from 'resend';
import { render } from '@react-email/render';
import { WelcomeEmail } from './templates/welcome';
import { TrialEndingEmail } from './templates/trial-ending';
import { ResetPasswordEmail } from './templates/reset-password';
import { EarlyAccessLeadEmail } from './templates/early-access-lead';
import { FeedbackEmail } from './templates/feedback';
import {
  welcomeStrings,
  trialEndingStrings,
  resetPasswordStrings,
} from './strings';
import type { EarlyAccessInput } from '@/lib/early-access/schema';
import type { FeedbackCategory } from '@/lib/feedback/schema';
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
  trialDays: number;
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
      trialDays: input.trialDays,
    })
  );

  return resend.emails.send({
    from: fromAddress(),
    to: input.to,
    subject: s.subject,
    html,
  });
}

export async function sendResetPasswordEmail(input: {
  to: string;
  radioName: string;
  locale: Locale;
  resetUrl: string;
}) {
  const resend = getResend();
  const s = resetPasswordStrings(input.locale);

  const html = await render(
    ResetPasswordEmail({
      radioName: input.radioName,
      locale: input.locale,
      resetUrl: input.resetUrl,
    })
  );

  return resend.emails.send({
    from: fromAddress(),
    to: input.to,
    subject: s.subject,
    html,
  });
}

export async function sendEarlyAccessLeadEmail(input: {
  lead: EarlyAccessInput;
  submittedAt: string;
}) {
  const resend = getResend();
  const html = await render(
    EarlyAccessLeadEmail({
      lead: input.lead,
      submittedAt: input.submittedAt,
    })
  );

  return resend.emails.send({
    from: fromAddress(),
    to: 'contact@aurapress.app',
    replyTo: input.lead.email,
    subject: `AURA Early Access — ${input.lead.radioStation} (${input.lead.plan})`,
    html,
  });
}

export async function sendFeedbackEmail(input: {
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
}) {
  const resend = getResend();
  const html = await render(
    FeedbackEmail({
      category: input.category,
      message: input.message,
      pageUrl: input.pageUrl,
      user: input.user,
      submittedAt: input.submittedAt,
    })
  );

  const stationOrEmail = input.user.radioName ?? input.user.email;
  const categoryTag =
    input.category.charAt(0).toUpperCase() + input.category.slice(1);

  return resend.emails.send({
    from: fromAddress(),
    to: 'contact@aurapress.app',
    replyTo: input.user.email,
    subject: `AURA Feedback — ${categoryTag} from ${stationOrEmail}`,
    html,
  });
}
