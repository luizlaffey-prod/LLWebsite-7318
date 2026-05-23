export type PlanTier = 'starter' | 'standard' | 'pro';

export interface PlanDefinition {
  tier: PlanTier;
  priceMonthly: number;
  bulletinsPerDay: number;
  maxDurationSeconds: number;
  voicesPerLanguage: number | 'unlimited';
  accentDepth: 'generic' | 'regional' | 'custom';
  formats: ('mp3' | 'wav' | 'broadcast')[];
  scheduling: 'none' | 'basic' | 'full';
  templates: number | 'custom';
  delivery: ('download' | 'email' | 'api' | 'ftp')[];
  whiteLabel: boolean;
  support: 'email' | 'email-chat' | 'priority';
  stripePriceEnvVar: string;
  /** Premium AI-generated background tracks per calendar month. 0 = locked. */
  musicTracksPerMonth: number;
}

export const PLANS: Record<PlanTier, PlanDefinition> = {
  starter: {
    tier: 'starter',
    priceMonthly: 19.99,
    bulletinsPerDay: 5,
    maxDurationSeconds: 60,
    voicesPerLanguage: 1,
    accentDepth: 'generic',
    formats: ['mp3'],
    scheduling: 'none',
    templates: 1,
    delivery: ['download'],
    whiteLabel: false,
    support: 'email',
    stripePriceEnvVar: 'STRIPE_PRICE_STARTER',
    musicTracksPerMonth: 0,
  },
  standard: {
    tier: 'standard',
    priceMonthly: 59.99,
    bulletinsPerDay: 10,
    maxDurationSeconds: 120,
    voicesPerLanguage: 3,
    accentDepth: 'regional',
    formats: ['mp3', 'wav'],
    scheduling: 'basic',
    templates: 3,
    delivery: ['download', 'email'],
    whiteLabel: false,
    support: 'email-chat',
    stripePriceEnvVar: 'STRIPE_PRICE_STANDARD',
    musicTracksPerMonth: 0,
  },
  pro: {
    tier: 'pro',
    priceMonthly: 129.99,
    bulletinsPerDay: 20,
    maxDurationSeconds: 180,
    voicesPerLanguage: 'unlimited',
    accentDepth: 'custom',
    formats: ['mp3', 'wav', 'broadcast'],
    scheduling: 'full',
    templates: 'custom',
    delivery: ['download', 'email', 'api', 'ftp'],
    whiteLabel: true,
    support: 'priority',
    stripePriceEnvVar: 'STRIPE_PRICE_PRO',
    musicTracksPerMonth: 30,
  },
};

export const PLAN_ORDER: PlanTier[] = ['starter', 'standard', 'pro'];

export const TRIAL_DAYS = 14;
export const TRIAL_TIER: PlanTier = 'pro';
export const TRIAL_DOWNGRADE_TO: PlanTier = 'starter';
export const OVERAGE_PRICE_CENTS = 50;

/**
 * Daily bulletin cap applied during the trial window only. The
 * effective tier is Pro (so users see every Pro feature: WAV,
 * cloning, dual-voice catalogs, etc.) but the volume limit is
 * tightened to guard against runaway ElevenLabs costs over the
 * 14-day trial. After conversion to a paid plan the cap returns
 * to whatever the chosen tier's bulletinsPerDay says.
 */
export const TRIAL_BULLETINS_PER_DAY = 10;
