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
