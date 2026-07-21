import { sql } from 'drizzle-orm';
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
// Written articles (web/newsroom feature). Lifecycle: a draft is generated,
// the editor reviews/approves it, then it can be published to the station's
// site. 'failed' covers generation errors.
export const articleStatusEnum = pgEnum('article_status', [
  'draft',
  'approved',
  'published',
  'failed',
]);
// Where the article's lead image came from. 'source' = the originating news
// outlet's own image (shown with credit); 'ai' = an AI-generated thematic
// illustration (must be labeled as such, never presented as a real photo);
// 'upload' = operator-provided; 'none' = text-only.
export const articleImageSourceEnum = pgEnum('article_image_source', [
  'source',
  'ai',
  'upload',
  'none',
]);
// pgEnum keeps all four historical values for backwards compatibility with
// rows written before the UI dropped 'state'/'city'. The app-level Zod and
// TS types now restrict new writes to ['global', 'country'].
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
  emailNotifications: boolean('email_notifications').notNull().default(true),
  brandLogoUrl: text('brand_logo_url'),
  brandAccentColor: text('brand_accent_color'),
  // Per-user opaque token for the public RSS feed at /feed/<token>.xml.
  // Null until the user first opens /settings/delivery, then a 32-byte
  // hex string. Rotating it invalidates any external subscriber — that
  // IS the security model since the feed URL itself is the only auth.
  feedToken: text('feed_token').unique(),
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

export const monthlyMusicUsage = pgTable(
  'monthly_music_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    tracksUsed: integer('tracks_used').notNull().default(0),
    tracksLimit: integer('tracks_limit').notNull(),
    overageCount: integer('overage_count').notNull().default(0),
    overageAmountCents: integer('overage_amount_cents').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userPeriodIdx: uniqueIndex('music_usage_user_period_idx').on(t.userId, t.periodStart),
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

/** One structural block of a written article body. */
export interface ArticleBlock {
  type: 'heading' | 'paragraph';
  text: string;
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

/**
 * Written journalistic articles generated from the same news research that
 * powers audio bulletins. The body is stored as an ordered array of blocks
 * (heading / paragraph) so the editor can edit and re-order piece by piece,
 * and so the WordPress/HTML publisher can render structure faithfully.
 * `status` gates publication behind human approval (starts 'draft').
 */
export const article = pgTable(
  'article',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    newsSearchId: uuid('news_search_id').references(() => newsSearch.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    // One-line standfirst / dek shown under the headline.
    lede: text('lede'),
    // Ordered content blocks: { type: 'heading'|'paragraph', text }.
    body: jsonb('body').$type<ArticleBlock[]>().notNull(),
    // Editor's working copy; when null the body above is authoritative.
    editedBody: jsonb('edited_body').$type<ArticleBlock[]>(),
    sourceName: text('source_name'),
    sourceArticleUrl: text('source_article_url'),
    imageUrl: text('image_url'),
    imageSource: articleImageSourceEnum('image_source').notNull().default('none'),
    imageCredit: text('image_credit'),
    categories: jsonb('categories').$type<string[]>().notNull().default([]),
    language: localeEnum('language').notNull(),
    wordCount: integer('word_count').notNull().default(0),
    status: articleStatusEnum('status').notNull().default('draft'),
    errorMessage: text('error_message'),
    // Set when the article is published to an external destination.
    publishedUrl: text('published_url'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('article_user_idx').on(t.userId, t.createdAt),
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
export type MonthlyMusicUsage = typeof monthlyMusicUsage.$inferSelect;
export type NewsSource = typeof newsSource.$inferSelect;
export type NewsSearch = typeof newsSearch.$inferSelect;
export type GeneratedAudio = typeof generatedAudio.$inferSelect;
export type Article = typeof article.$inferSelect;
export type Voice = typeof voice.$inferSelect;
export type VoicePreference = typeof voicePreference.$inferSelect;

// --- Automations ---
export const automationStatusEnum = pgEnum('automation_status', [
  'pending',
  'running',
  'succeeded',
  'failed',
]);

export interface ScheduleSlot {
  /** Local time HH:mm (timezone applied at run time). */
  time: string;
  categories: string[];
  /**
   * Days of the week this slot fires on, as JS Date.getDay() values
   * (0=Sunday, 1=Monday, … 6=Saturday). Undefined or empty array
   * means "every day" (legacy behavior — rows written before this
   * field existed). Evaluated in the schedule's timezone, not UTC.
   */
  daysOfWeek?: number[];
}

export const automationSchedule = pgTable(
  'automation_schedule',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slots: jsonb('slots').$type<ScheduleSlot[]>().notNull(),
    durationSeconds: integer('duration_seconds').notNull(),
    language: localeEnum('language').notNull(),
    voiceId: uuid('voice_id').references(() => voice.id, { onDelete: 'set null' }),
    speed: real('speed').notNull().default(1.0),
    bgTrackUrl: text('bg_track_url'),
    duckAudio: boolean('duck_audio').notNull().default(true),
    includeWeather: boolean('include_weather').notNull().default(false),
    weatherFormat: weatherFormatEnum('weather_format').default('separate'),
    geographicScope: geoScopeEnum('geographic_scope').notNull().default('global'),
    location: text('location'),
    // Dedicated city for the weather block — decoupled from `location`
    // (which scopes the news search) so global automations can still
    // ship local weather. Falls back to `location` when null.
    weatherCity: text('weather_city'),
    transitionEffects: boolean('transition_effects').notNull().default(true),
    /**
     * Minutes before the slot's air time when generation should
     * START. Operator-configurable per automation so a station can
     * trade "give me the freshest news possible" (low value, ~10 min)
     * against "make sure the audio is sitting in my local folder
     * with plenty of buffer" (high value, up to 120 min).
     */
    leadTimeMinutes: integer('lead_time_minutes').notNull().default(60),
    bias: biasEnum('bias').notNull().default('center'),
    timezone: text('timezone').notNull().default('UTC'),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('automation_user_idx').on(t.userId, t.enabled),
  })
);

export const automationExecution = pgTable(
  'automation_execution',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    automationScheduleId: uuid('automation_schedule_id')
      .notNull()
      .references(() => automationSchedule.id, { onDelete: 'cascade' }),
    audioId: uuid('audio_id').references(() => generatedAudio.id, { onDelete: 'set null' }),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    executedAt: timestamp('executed_at', { withTimezone: true }),
    slotTime: text('slot_time').notNull(),
    status: automationStatusEnum('status').notNull().default('pending'),
    retryCount: integer('retry_count').notNull().default(0),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    schedIdx: index('automation_exec_sched_idx').on(t.automationScheduleId, t.scheduledFor),
  })
);

export type AutomationSchedule = typeof automationSchedule.$inferSelect;
export type AutomationExecution = typeof automationExecution.$inferSelect;

// --- Delivery endpoints (Pro) ---
export const deliveryTypeEnum = pgEnum('delivery_type', [
  'ftp',
  'http',
  'email',
  // 'local_folder' is a pull-style destination: the dispatcher records
  // status='pending' so a client-side worker running in the operator's
  // browser can pick the audio up and write it to a chosen filesystem
  // folder via the File System Access API. No outbound network call
  // from the server side for this type.
  'local_folder',
]);
export const deliveryStatusEnum = pgEnum('delivery_status', [
  'pending',
  'success',
  'failed',
]);

export interface LocalFolderConfig {
  /** Label only — the browser holds the actual directory handle. */
  label?: string;
}

export interface FtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  remoteDir?: string;
  secure?: boolean;
}

export interface HttpConfig {
  url: string;
  method: 'POST' | 'PUT';
  bearerToken?: string;
  customHeaders?: Record<string, string>;
}

export interface EmailConfig {
  recipient: string;
}

export const deliveryEndpoint = pgTable(
  'delivery_endpoint',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: deliveryTypeEnum('type').notNull(),
    /** Encrypted JSON blob (use lib/crypto/secrets.ts before persisting). */
    configEncrypted: text('config_encrypted').notNull(),
    slotNamingPattern: text('slot_naming_pattern').notNull().default('{{name}}_{{date}}'),
    enabled: boolean('enabled').notNull().default(true),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('delivery_user_idx').on(t.userId),
  })
);

export const deliveryLog = pgTable(
  'delivery_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deliveryEndpointId: uuid('delivery_endpoint_id')
      .notNull()
      .references(() => deliveryEndpoint.id, { onDelete: 'cascade' }),
    audioId: uuid('audio_id').references(() => generatedAudio.id, {
      onDelete: 'set null',
    }),
    status: deliveryStatusEnum('status').notNull(),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    endpointIdx: index('delivery_log_endpoint_idx').on(t.deliveryEndpointId),
  })
);

export type DeliveryEndpoint = typeof deliveryEndpoint.$inferSelect;
export type DeliveryLog = typeof deliveryLog.$inferSelect;

// --- Website publishing (Pro) ---
// Where approved written articles get pushed. Each station configures its
// own connection in /settings/publishing — WordPress (REST API) or a
// generic webhook — so AURA never needs to know the site ahead of time.
export const publishingTypeEnum = pgEnum('publishing_type', [
  'wordpress',
  'webhook',
]);

// WordPress: username + application password go in the encrypted blob;
// the site URL and default post status are stored in plaintext columns so
// the UI can show them without decrypting.
export interface WordPressSecret {
  username: string;
  appPassword: string;
}

// Webhook: an optional shared secret used to sign the payload (HMAC-SHA256
// in the X-AURA-Signature header) so the receiver can verify authenticity.
export interface WebhookSecret {
  secret?: string;
}

export const publishingConnection = pgTable(
  'publishing_connection',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // One connection per station for now — the article editor publishes to
    // a single known target, so a unique user_id keeps the model simple.
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: publishingTypeEnum('type').notNull(),
    // WordPress site root or the webhook endpoint URL.
    siteUrl: text('site_url').notNull(),
    /** Encrypted JSON blob (use lib/crypto/secrets.ts before persisting). */
    configEncrypted: text('config_encrypted').notNull(),
    // WordPress only: 'draft' (default — human reviews on the site before
    // going live) or 'publish' (goes live immediately).
    defaultStatus: text('default_status').notNull().default('draft'),
    enabled: boolean('enabled').notNull().default(true),
    // Stamped when a test connection last succeeded.
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('publishing_connection_user_idx').on(t.userId),
  })
);

export type PublishingConnection = typeof publishingConnection.$inferSelect;

// --- Anti-abuse: trial-stretching prevention ---
// Each signup attempt records the requester's hashed IP. The signup
// pre-check route counts entries in the last 30 days for the caller's
// IP and rejects when the count crosses MAX_SIGNUPS_PER_IP. Hashing
// keeps personal data off the row (the IP itself is never persisted
// in plaintext) — only the salted SHA-256 digest, which is enough to
// detect the same source without ever being able to recover it.
export const signupAttempt = pgTable(
  'signup_attempt',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ipHash: text('ip_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    ipIdx: index('signup_attempt_ip_idx').on(t.ipHash, t.createdAt),
  })
);

// --- Studio Pro integration -------------------------------------------------
//
// These tables deliberately sit beside the existing user-owned AURA tables.
// Existing accounts, automations and generated_audio rows keep their current
// ownership model while Studio Pro gains an organization/station/device
// boundary suitable for machine-to-machine access.
export const organizationRoleEnum = pgEnum('organization_role', [
  'owner',
  'admin',
  'operator',
  'viewer',
]);
export const stationDeviceStatusEnum = pgEnum('station_device_status', [
  'active',
  'revoked',
]);
export const integrationRequestStatusEnum = pgEnum('integration_request_status', [
  'pending',
  'processing',
  'ready',
  'failed',
  'expired',
  'canceled',
]);
export const stationEventTypeEnum = pgEnum('station_event_type', [
  'asset_downloaded',
  'asset_validated',
  'asset_queued',
  'asset_aired',
  'asset_skipped',
  'asset_failed',
]);
export const studioEntitlementStatusEnum = pgEnum('studio_entitlement_status', [
  'trialing',
  'active',
  'grace',
  'suspended',
  'canceled',
]);
export const studioLicenseLeaseStatusEnum = pgEnum('studio_license_lease_status', [
  'active',
  'superseded',
  'revoked',
  'expired',
]);
export const studioLicenseChallengePurposeEnum = pgEnum(
  'studio_license_challenge_purpose',
  ['lease', 'heartbeat', 'deactivate']
);

export const organization = pgTable(
  'organization',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    billingUserId: text('billing_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex('organization_slug_idx').on(t.slug),
    billingUserIdx: index('organization_billing_user_idx').on(t.billingUserId),
  })
);

export const organizationMember = pgTable(
  'organization_member',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: organizationRoleEnum('role').notNull().default('viewer'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    organizationUserIdx: uniqueIndex('organization_member_org_user_idx').on(
      t.organizationId,
      t.userId
    ),
    userIdx: index('organization_member_user_idx').on(t.userId),
  })
);

export const studioEntitlement = pgTable(
  'studio_entitlement',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    status: studioEntitlementStatusEnum('status').notNull().default('trialing'),
    planCode: text('plan_code').notNull().default('trial'),
    source: text('source').notNull().default('trial'),
    sourceReference: text('source_reference'),
    features: jsonb('features').$type<string[]>().notNull(),
    maxStations: integer('max_stations').notNull().default(1),
    maxDevicesPerStation: integer('max_devices_per_station').notNull().default(2),
    maxConcurrentOutputs: integer('max_concurrent_outputs').notNull().default(1),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    graceUntil: timestamp('grace_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    organizationIdx: uniqueIndex('studio_entitlement_organization_idx').on(
      t.organizationId
    ),
    sourceReferenceIdx: index('studio_entitlement_source_reference_idx').on(
      t.source,
      t.sourceReference
    ),
  })
);

export const station = pgTable(
  'station',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    timezone: text('timezone').notNull().default('UTC'),
    defaultLanguage: localeEnum('default_language').notNull().default('en'),
    defaultVoiceId: uuid('default_voice_id').references(() => voice.id, {
      onDelete: 'set null',
    }),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    organizationSlugIdx: uniqueIndex('station_org_slug_idx').on(
      t.organizationId,
      t.slug
    ),
    organizationIdx: index('station_organization_idx').on(t.organizationId),
  })
);

export const stationDevice = pgTable(
  'station_device',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stationId: uuid('station_id')
      .notNull()
      .references(() => station.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    platform: text('platform').notNull(),
    status: stationDeviceStatusEnum('status').notNull().default('active'),
    activationSlot: integer('activation_slot'),
    scopes: jsonb('scopes').$type<string[]>().notNull(),
    deviceKeyAlgorithm: text('device_key_algorithm').notNull(),
    devicePublicKey: text('device_public_key').notNull(),
    deviceKeyFingerprint: text('device_key_fingerprint').notNull(),
    accessTokenHash: text('access_token_hash').notNull(),
    accessTokenPrefix: text('access_token_prefix').notNull(),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
    }).notNull(),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
    }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    lastLicenseIssuedAt: timestamp('last_license_issued_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    accessTokenIdx: uniqueIndex('station_device_access_token_idx').on(
      t.accessTokenHash
    ),
    refreshTokenIdx: uniqueIndex('station_device_refresh_token_idx').on(
      t.refreshTokenHash
    ),
    stationIdx: index('station_device_station_idx').on(t.stationId, t.status),
    activationSlotIdx: uniqueIndex('station_device_activation_slot_idx').on(
      t.stationId,
      t.activationSlot
    ),
    keyFingerprintIdx: uniqueIndex('station_device_key_fingerprint_idx').on(
      t.deviceKeyFingerprint
    ).where(sql`${t.status} = 'active'`),
  })
);

export const devicePairingCode = pgTable(
  'device_pairing_code',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stationId: uuid('station_id')
      .notNull()
      .references(() => station.id, { onDelete: 'cascade' }),
    requestedByUserId: text('requested_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    scopes: jsonb('scopes').$type<string[]>().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    codeIdx: uniqueIndex('device_pairing_code_hash_idx').on(t.codeHash),
    stationIdx: index('device_pairing_station_idx').on(t.stationId, t.expiresAt),
  })
);

export const studioLicenseChallenge = pgTable(
  'studio_license_challenge',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deviceId: uuid('device_id')
      .notNull()
      .references(() => stationDevice.id, { onDelete: 'cascade' }),
    purpose: studioLicenseChallengePurposeEnum('purpose').notNull(),
    challengeHash: text('challenge_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    deviceExpiryIdx: index('studio_license_challenge_device_expiry_idx').on(
      t.deviceId,
      t.expiresAt
    ),
  })
);

export const studioLicenseLease = pgTable(
  'studio_license_lease',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entitlementId: uuid('entitlement_id')
      .notNull()
      .references(() => studioEntitlement.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    stationId: uuid('station_id')
      .notNull()
      .references(() => station.id, { onDelete: 'cascade' }),
    deviceId: uuid('device_id')
      .notNull()
      .references(() => stationDevice.id, { onDelete: 'cascade' }),
    status: studioLicenseLeaseStatusEnum('status').notNull().default('active'),
    tokenHash: text('token_hash').notNull(),
    keyId: text('key_id').notNull(),
    planCode: text('plan_code').notNull(),
    features: jsonb('features').$type<string[]>().notNull(),
    appVersion: text('app_version').notNull(),
    buildChannel: text('build_channel').notNull(),
    onlineExpiresAt: timestamp('online_expires_at', { withTimezone: true }).notNull(),
    offlineGraceUntil: timestamp('offline_grace_until', {
      withTimezone: true,
    }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tokenHashIdx: uniqueIndex('studio_license_lease_token_hash_idx').on(t.tokenHash),
    deviceStatusIdx: index('studio_license_lease_device_status_idx').on(
      t.deviceId,
      t.status,
      t.createdAt
    ),
    stationExpiryIdx: index('studio_license_lease_station_expiry_idx').on(
      t.stationId,
      t.offlineGraceUntil
    ),
  })
);

export const studioOutputLease = pgTable(
  'studio_output_lease',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stationId: uuid('station_id')
      .notNull()
      .references(() => station.id, { onDelete: 'cascade' }),
    slot: integer('slot').notNull(),
    deviceId: uuid('device_id')
      .notNull()
      .references(() => stationDevice.id, { onDelete: 'cascade' }),
    licenseLeaseId: uuid('license_lease_id')
      .notNull()
      .references(() => studioLicenseLease.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id').notNull(),
    outputId: text('output_id').notNull(),
    appVersion: text('app_version').notNull(),
    lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true })
      .notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    stationSlotIdx: uniqueIndex('studio_output_lease_station_slot_idx').on(
      t.stationId,
      t.slot
    ),
    sessionIdx: uniqueIndex('studio_output_lease_session_idx').on(t.sessionId),
    expiryIdx: index('studio_output_lease_expiry_idx').on(t.expiresAt),
  })
);

export const studioLicenseEvent = pgTable(
  'studio_license_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    stationId: uuid('station_id').references(() => station.id, {
      onDelete: 'set null',
    }),
    deviceId: uuid('device_id').references(() => stationDevice.id, {
      onDelete: 'set null',
    }),
    type: text('type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    organizationCreatedIdx: index('studio_license_event_org_created_idx').on(
      t.organizationId,
      t.createdAt
    ),
    stationCreatedIdx: index('studio_license_event_station_created_idx').on(
      t.stationId,
      t.createdAt
    ),
  })
);

export interface IntegrationContentInput {
  kind: 'news_bulletin';
  source:
    | {
        mode: 'article';
        title: string;
        description: string;
        source?: string;
        url?: string;
      }
    | {
        mode: 'search';
        categories: string[];
        bias: 'left' | 'center' | 'right' | 'mixed';
        geographicScope: 'global' | 'country';
        location?: string;
      };
  title?: string;
  durationSeconds: number;
  language: 'en' | 'pt' | 'es';
  voiceId?: string;
  speed: number;
  includeWeather: boolean;
  weatherFormat: 'separate' | 'integrated';
  weatherLocation?: string;
  transitionEffects: boolean;
  scheduledFor?: string;
  validForSeconds: number;
}

export interface IntegrationSourceReference {
  title: string;
  source?: string;
  url?: string;
  publishedAt?: string;
}

export const integrationContentRequest = pgTable(
  'integration_content_request',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stationId: uuid('station_id')
      .notNull()
      .references(() => station.id, { onDelete: 'cascade' }),
    requestedByDeviceId: uuid('requested_by_device_id').references(
      () => stationDevice.id,
      { onDelete: 'set null' }
    ),
    idempotencyKey: text('idempotency_key').notNull(),
    requestHash: text('request_hash').notNull(),
    kind: text('kind').notNull(),
    status: integrationRequestStatusEnum('status').notNull().default('pending'),
    input: jsonb('input').$type<IntegrationContentInput>().notNull(),
    sourceReferences: jsonb('source_references').$type<IntegrationSourceReference[]>(),
    audioId: uuid('audio_id').references(() => generatedAudio.id, {
      onDelete: 'set null',
    }),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
    validFrom: timestamp('valid_from', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    assetSha256: text('asset_sha256'),
    assetBytes: integer('asset_bytes'),
    assetContentType: text('asset_content_type'),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    stationIdempotencyIdx: uniqueIndex('integration_request_station_idem_idx').on(
      t.stationId,
      t.idempotencyKey
    ),
    stationUpdatedIdx: index('integration_request_station_updated_idx').on(
      t.stationId,
      t.updatedAt
    ),
    pendingIdx: index('integration_request_pending_idx').on(t.status, t.createdAt),
  })
);

export const stationEvent = pgTable(
  'station_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stationId: uuid('station_id')
      .notNull()
      .references(() => station.id, { onDelete: 'cascade' }),
    deviceId: uuid('device_id')
      .notNull()
      .references(() => stationDevice.id, { onDelete: 'cascade' }),
    contentRequestId: uuid('content_request_id').references(
      () => integrationContentRequest.id,
      { onDelete: 'set null' }
    ),
    audioId: uuid('audio_id').references(() => generatedAudio.id, {
      onDelete: 'set null',
    }),
    type: stationEventTypeEnum('type').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    deviceIdempotencyIdx: uniqueIndex('station_event_device_idem_idx').on(
      t.deviceId,
      t.idempotencyKey
    ),
    stationOccurredIdx: index('station_event_station_occurred_idx').on(
      t.stationId,
      t.occurredAt
    ),
  })
);

export type Organization = typeof organization.$inferSelect;
export type OrganizationMember = typeof organizationMember.$inferSelect;
export type StudioEntitlement = typeof studioEntitlement.$inferSelect;
export type Station = typeof station.$inferSelect;
export type StationDevice = typeof stationDevice.$inferSelect;
export type DevicePairingCode = typeof devicePairingCode.$inferSelect;
export type StudioLicenseChallenge = typeof studioLicenseChallenge.$inferSelect;
export type StudioLicenseLease = typeof studioLicenseLease.$inferSelect;
export type StudioOutputLease = typeof studioOutputLease.$inferSelect;
export type StudioLicenseEvent = typeof studioLicenseEvent.$inferSelect;
export type IntegrationContentRequest = typeof integrationContentRequest.$inferSelect;
export type StationEvent = typeof stationEvent.$inferSelect;
