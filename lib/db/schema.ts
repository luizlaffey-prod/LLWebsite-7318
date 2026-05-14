import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  uuid,
  jsonb,
  real,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// --- Enums ---
export const localeEnum = pgEnum('locale', ['en', 'pt', 'es']);
export const planEnum = pgEnum('plan', ['trial', 'starter', 'standard', 'pro']);
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
]);
export const providerEnum = pgEnum('billing_provider', ['stripe', 'paypal']);
export const biasEnum = pgEnum('news_bias', ['left', 'center', 'right', 'mixed']);
export const newsSourceProviderEnum = pgEnum('news_source_provider', [
  'newsapi',
  'gnews',
  'rss',
]);
export const audioStatusEnum = pgEnum('audio_status', [
  'pending',
  'generating',
  'ready',
  'failed',
]);
export const voiceGenderEnum = pgEnum('voice_gender', ['male', 'female', 'neutral']);
export const weatherFormatEnum = pgEnum('weather_format', ['separate', 'integrated']);
export const geoScopeEnum = pgEnum('geo_scope', ['global', 'country', 'state', 'city']);

// --- Better Auth core tables ---
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  name: text('name'),
  image: text('image'),
  radioName: text('radio_name'),
  locale: localeEnum('locale').notNull().default('en'),
  timezone: text('timezone').notNull().default('UTC'),
  plan: planEnum('plan').notNull().default('trial'),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  downgradesTo: planEnum('downgrades_to').default('starter'),
  stripeCustomerId: text('stripe_customer_id'),
  paypalSubscriptionId: text('paypal_subscription_id'),
  subscriptionStatus: subscriptionStatusEnum('subscription_status'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// --- AURA billing ---
export const subscription = pgTable('subscription', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  provider: providerEnum('provider').notNull(),
  tier: planEnum('tier').notNull(),
  status: subscriptionStatusEnum('status').notNull(),
  externalId: text('external_id').notNull(),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  cancelAt: timestamp('cancel_at', { withTimezone: true }),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  trialEnd: timestamp('trial_end', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const usagePeriod = pgTable(
  'usage_period',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    bulletinsUsed: integer('bulletins_used').notNull().default(0),
    bulletinsLimit: integer('bulletins_limit').notNull(),
    overageCount: integer('overage_count').notNull().default(0),
    overageAmountCents: integer('overage_amount_cents').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userPeriodIdx: uniqueIndex('usage_user_period_idx').on(t.userId, t.periodStart),
  })
);

// --- AURA content ---
export const newsSource = pgTable(
  'news_source',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    country: text('country'),
    language: text('language').notNull(),
    rssUrl: text('rss_url'),
    apiSourceId: text('api_source_id'),
    apiProvider: newsSourceProviderEnum('api_provider').notNull(),
    bias: biasEnum('bias').notNull().default('mixed'),
    trustScore: integer('trust_score').notNull().default(80),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    biasIdx: index('news_source_bias_idx').on(t.bias),
  })
);

export const newsSearch = pgTable('news_search', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  categories: jsonb('categories').$type<string[]>().notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  language: localeEnum('language').notNull(),
  bias: biasEnum('bias').notNull().default('center'),
  includeWeather: boolean('include_weather').notNull().default(false),
  weatherFormat: weatherFormatEnum('weather_format').default('separate'),
  geographicScope: geoScopeEnum('geographic_scope').notNull().default('global'),
  location: text('location'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export interface EmotionBlock {
  text: string;
  emotion: 'ENTHUSIASM' | 'SERIOUSNESS' | 'CONCERN' | 'NEUTRAL' | 'DRAMATIC';
  duracaoSegundos: number;
}

export const generatedAudio = pgTable(
  'generated_audio',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    newsSearchId: uuid('news_search_id').references(() => newsSearch.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    sourceArticleUrl: text('source_article_url'),
    sourceName: text('source_name'),
    originalScript: jsonb('original_script').$type<EmotionBlock[]>().notNull(),
    editedScript: jsonb('edited_script').$type<EmotionBlock[]>(),
    voiceId: uuid('voice_id'),
    speed: real('speed').notNull().default(1.0),
    bgTrackUrl: text('bg_track_url'),
    audioUrl: text('audio_url'),
    durationSeconds: integer('duration_seconds').notNull().default(0),
    language: localeEnum('language').notNull(),
    status: audioStatusEnum('status').notNull().default('pending'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('generated_audio_user_idx').on(t.userId, t.createdAt),
  })
);

export const voice = pgTable(
  'voice',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    elevenLabsVoiceId: text('eleven_labs_voice_id').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    languages: jsonb('languages').$type<string[]>().notNull(),
    gender: voiceGenderEnum('gender').notNull().default('neutral'),
    style: text('style'),
    accent: text('accent'),
    tierRequired: planEnum('tier_required').notNull().default('starter'),
    previewUrl: text('preview_url'),
    isCloned: boolean('is_cloned').notNull().default(false),
    ownerUserId: text('owner_user_id').references(() => user.id, {
      onDelete: 'cascade',
    }),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    elevenIdx: index('voice_eleven_idx').on(t.elevenLabsVoiceId),
  })
);

export const voicePreference = pgTable(
  'voice_preference',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    voiceId: uuid('voice_id')
      .notNull()
      .references(() => voice.id, { onDelete: 'cascade' }),
    speed: real('speed').notNull().default(1.0),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userVoiceIdx: uniqueIndex('voice_pref_user_voice_idx').on(t.userId, t.voiceId),
  })
);

// --- Type exports ---
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Subscription = typeof subscription.$inferSelect;
export type UsagePeriod = typeof usagePeriod.$inferSelect;
export type NewsSource = typeof newsSource.$inferSelect;
export type NewsSearch = typeof newsSearch.$inferSelect;
export type GeneratedAudio = typeof generatedAudio.$inferSelect;
export type Voice = typeof voice.$inferSelect;
export type VoicePreference = typeof voicePreference.$inferSelect;
