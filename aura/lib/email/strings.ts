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
