import type { Locale } from '@/i18n';

export interface WelcomeStrings {
  subject: string;
  greeting: (radioName: string) => string;
  body1: (days: number) => string;
  body2: string;
  cta: string;
  signoff: string;
  footer: string;
}

const en: WelcomeStrings = {
  subject: 'Welcome to AURA',
  greeting: (radio) => `Welcome${radio ? `, ${radio}` : ''}.`,
  body1: (days) =>
    `Your ${days}-day Pro trial is live. Search global news, generate scripts with emotion cues, and ship broadcast-quality audio — all without leaving the browser.`,
  body2:
    "You'll be charged only after the trial ends. We'll email you one day before that happens, and your account will auto-convert to Starter unless you upgrade.",
  cta: 'Open your dashboard',
  signoff: 'The AURA team',
  footer: 'AURA — Automated Urban Radio Audio',
};

const pt: WelcomeStrings = {
  subject: 'Bem-vindo à AURA',
  greeting: (radio) => `Boas-vindas${radio ? `, ${radio}` : ''}.`,
  body1: (days) =>
    `Seu trial Pro de ${days} dias está ativo. Busque notícias do mundo todo, gere roteiros com marcações de emoção e entregue áudio profissional — tudo direto do navegador.`,
  body2:
    'A cobrança só acontece ao fim do trial. Avisaremos por email 1 dia antes; sua conta converte automaticamente para o plano Starter caso você não faça upgrade.',
  cta: 'Abrir meu painel',
  signoff: 'Equipe AURA',
  footer: 'AURA — Áudio de Rádio Urbano Automatizado',
};

const es: WelcomeStrings = {
  subject: 'Bienvenido a AURA',
  greeting: (radio) => `Bienvenido${radio ? `, ${radio}` : ''}.`,
  body1: (days) =>
    `Tu prueba Pro de ${days} días está activa. Busca noticias globales, genera guiones con emoción y entrega audio profesional, todo desde el navegador.`,
  body2:
    'Solo se cobra al terminar la prueba. Te avisaremos por correo 1 día antes; tu cuenta se convierte automáticamente al plan Starter si no haces upgrade.',
  cta: 'Abrir mi panel',
  signoff: 'Equipo AURA',
  footer: 'AURA — Audio de Radio Urbana Automatizado',
};

const STRINGS: Record<Locale, WelcomeStrings> = { en, pt, es };

export function welcomeStrings(locale: Locale): WelcomeStrings {
  return STRINGS[locale] ?? STRINGS.en;
}

export interface TrialEndingStrings {
  subject: string;
  greeting: (radioName: string) => string;
  body1: string;
  body2: string;
  body3: string;
  ctaUpgrade: string;
  ctaManage: string;
  signoff: string;
  footer: string;
}

const trialEn: TrialEndingStrings = {
  subject: 'Your AURA trial ends tomorrow',
  greeting: (r) => `Hi${r ? `, ${r}` : ''},`,
  body1: 'Your 7-day Pro trial ends in 24 hours.',
  body2:
    "Unless you upgrade, AURA will switch your account to the Starter plan automatically — 5 bulletins a day, 1-minute max, 1 preset voice per language. Nothing breaks; you just get less headroom.",
  body3: 'To keep Pro features (20 bulletins/day, 3-min runtime, full voice catalog, custom voice clone), upgrade in one click.',
  ctaUpgrade: 'Keep Pro',
  ctaManage: 'Manage billing',
  signoff: 'The AURA team',
  footer: 'AURA — Automated Urban Radio Audio',
};

const trialPt: TrialEndingStrings = {
  subject: 'Seu trial AURA termina amanhã',
  greeting: (r) => `Olá${r ? `, ${r}` : ''},`,
  body1: 'Seu trial Pro de 7 dias termina em 24 horas.',
  body2:
    'Se você não fizer upgrade, sua conta será convertida automaticamente para o plano Starter — 5 boletins por dia, máximo 1 minuto, 1 voz preset por idioma. Nada quebra; só fica menos generoso.',
  body3: 'Para manter os recursos Pro (20 boletins/dia, 3 minutos, catálogo de vozes completo, clonagem de voz), faça upgrade em um clique.',
  ctaUpgrade: 'Manter Pro',
  ctaManage: 'Gerenciar faturamento',
  signoff: 'Equipe AURA',
  footer: 'AURA — Áudio de Rádio Urbano Automatizado',
};

const trialEs: TrialEndingStrings = {
  subject: 'Tu prueba AURA termina mañana',
  greeting: (r) => `Hola${r ? `, ${r}` : ''},`,
  body1: 'Tu prueba Pro de 7 días termina en 24 horas.',
  body2:
    'Si no haces upgrade, tu cuenta se cambiará automáticamente al plan Starter: 5 boletines por día, máximo 1 minuto, 1 voz preset por idioma. Nada se rompe; solo tienes menos margen.',
  body3: 'Para mantener funciones Pro (20 boletines/día, 3 minutos, catálogo completo de voces, clonación de voz), haz upgrade con un clic.',
  ctaUpgrade: 'Mantener Pro',
  ctaManage: 'Administrar facturación',
  signoff: 'Equipo AURA',
  footer: 'AURA — Audio de Radio Urbana Automatizado',
};

const TRIAL_STRINGS: Record<Locale, TrialEndingStrings> = {
  en: trialEn,
  pt: trialPt,
  es: trialEs,
};

export function trialEndingStrings(locale: Locale): TrialEndingStrings {
  return TRIAL_STRINGS[locale] ?? TRIAL_STRINGS.en;
}

export interface ResetPasswordStrings {
  subject: string;
  greeting: (radioName: string) => string;
  body1: string;
  cta: string;
  fallbackHint: string;
  ignoreHint: string;
}

const resetEn: ResetPasswordStrings = {
  subject: 'Reset your AURA password',
  greeting: (r) => `Hi${r ? `, ${r}` : ''},`,
  body1:
    'We received a request to reset the password on your AURA account. Click the button below to choose a new one. The link is good for one hour.',
  cta: 'Choose a new password',
  fallbackHint: 'Button not working? Paste this URL into your browser:',
  ignoreHint:
    "If you didn't request this, you can ignore the email — your password stays the same and nothing is changed.",
};

const resetPt: ResetPasswordStrings = {
  subject: 'Redefinir sua senha AURA',
  greeting: (r) => `Olá${r ? `, ${r}` : ''},`,
  body1:
    'Recebemos uma solicitação para redefinir a senha da sua conta AURA. Clique no botão abaixo pra escolher uma nova. O link expira em uma hora.',
  cta: 'Escolher nova senha',
  fallbackHint: 'O botão não funciona? Cole esta URL no navegador:',
  ignoreHint:
    'Se você não pediu isso, pode ignorar o email — sua senha continua a mesma e nada é alterado.',
};

const resetEs: ResetPasswordStrings = {
  subject: 'Restablecer tu contraseña AURA',
  greeting: (r) => `Hola${r ? `, ${r}` : ''},`,
  body1:
    'Recibimos una solicitud para restablecer la contraseña de tu cuenta AURA. Haz clic en el botón abajo para elegir una nueva. El enlace dura una hora.',
  cta: 'Elegir nueva contraseña',
  fallbackHint: '¿El botón no funciona? Pega esta URL en tu navegador:',
  ignoreHint:
    'Si no solicitaste esto, puedes ignorar el correo — tu contraseña sigue igual y nada cambia.',
};

const RESET_STRINGS: Record<Locale, ResetPasswordStrings> = {
  en: resetEn,
  pt: resetPt,
  es: resetEs,
};

export function resetPasswordStrings(locale: Locale): ResetPasswordStrings {
  return RESET_STRINGS[locale] ?? RESET_STRINGS.en;
}
