import { sqliteTable, text, real, integer, uniqueIndex, boolean } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ========================
// USERS TABLE
// ========================
export const users = sqliteTable('users', {
  user_id: text('user_id').primaryKey(),
  email: text('email').unique().notNull(),
  name: text('name'),
  created_at: text('created_at').default(new Date().toISOString()),
  status: text('status').default('active'),
});

// ========================
// ORIGINALS TABLE (Programas Licenciáveis)
// ========================
export const originals = sqliteTable('originals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').unique().notNull(), // 'luiz-laffey-collection', 'zero-point-zero'
  name: text('name').notNull(), // Display name
  is_active: integer('is_active', { mode: 'boolean' }).default(true),
  created_at: text('created_at').default(new Date().toISOString()),
});

// ========================
// PLANS TABLE
// ========================
export const plans = sqliteTable('plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').unique().notNull(), // 'monthly', 'annual', 'dual-annual'
  name: text('name').notNull(), // Display name
  allows_multiple: integer('allows_multiple', { mode: 'boolean' }).notNull(), // 0 = single original, 1 = all originals
  price_cents: integer('price_cents').notNull(), // Price in cents
  billing_cycle: text('billing_cycle'), // 'monthly', 'annual', etc
  description: text('description'),
  is_active: integer('is_active', { mode: 'boolean' }).default(true),
  created_at: text('created_at').default(new Date().toISOString()),
});

// ========================
// SUBSCRIPTIONS TABLE
// ========================
// One subscription row per user + plan combo
// Access to specific original(s) is defined in subscription_originals table
export const subscriptions = sqliteTable('subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: text('user_id').notNull().references(() => users.user_id),
  plan_id: integer('plan_id').notNull().references(() => plans.id),
  status: text('status').notNull().default('active'), // 'active', 'canceled', 'expired'
  start_date: text('start_date').default(new Date().toISOString()),
  end_date: text('end_date'), // NULL = no expiration
  payment_id: text('payment_id'), // PayPal transaction ID
  created_at: text('created_at').default(new Date().toISOString()),
});

// ========================
// SUBSCRIPTION_ORIGINALS TABLE (PIVOT - CRITICAL)
// ========================
// Links subscriptions to originals
// This is the source of truth for access control
export const subscriptionOriginals = sqliteTable(
  'subscription_originals',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    subscription_id: integer('subscription_id').notNull().references(() => subscriptions.id),
    original_id: integer('original_id').notNull().references(() => originals.id),
    created_at: text('created_at').default(new Date().toISOString()),
  },
  (table) => ({
    // Prevent duplicate subscription-original links
    uniqueSubscriptionOriginal: uniqueIndex('unique_subscription_original')
      .on(table.subscription_id, table.original_id),
  })
);

// ========================
// RELATIONS
// ========================
export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  stationSettings: many(stationSettings),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.user_id],
    references: [users.user_id],
  }),
  plan: one(plans, {
    fields: [subscriptions.plan_id],
    references: [plans.id],
  }),
  originals: many(subscriptionOriginals),
}));

export const subscriptionOriginalsRelations = relations(subscriptionOriginals, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [subscriptionOriginals.subscription_id],
    references: [subscriptions.id],
  }),
  original: one(originals, {
    fields: [subscriptionOriginals.original_id],
    references: [originals.id],
  }),
}));

export const originalsRelations = relations(originals, ({ many }) => ({
  subscriptionOriginals: many(subscriptionOriginals),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

// ========================
// STATION SETTINGS TABLE
// ========================
// Stores broadcaster operational configuration
export const stationSettings = sqliteTable('station_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: text('user_id').notNull().references(() => users.user_id),

  // Station Identity
  station_name: text('station_name').notNull(),
  station_call_sign: text('station_call_sign'),
  country: text('country').notNull(),
  city_region: text('city_region').notNull(),
  broadcast_type: text('broadcast_type'), // FM, AM, Online Radio, Community, Commercial
  primary_language: text('primary_language').notNull(),

  // Broadcast Preferences
  audio_format: text('audio_format'), // WAV, MP3
  bitrate: text('bitrate'), // 128, 192, 256, 320
  loudness_standard: text('loudness_standard').default('-16 LUFS'), // -16 LUFS, -14 LUFS
  is_stereo: integer('is_stereo', { mode: 'boolean' }).default(true),
  file_naming_preference: text('file_naming_preference'),
  time_zone: text('time_zone'),
  air_days: text('air_days'), // JSON array of days
  air_time_start: text('air_time_start'), // HH:MM format
  air_time_end: text('air_time_end'), // HH:MM format
  is_live: integer('is_live', { mode: 'boolean' }).default(false),
  usage_type: text('usage_type'), // full_episode_only, clips_allowed

  // Branding & Assets
  logo_dark_url: text('logo_dark_url'),
  logo_light_url: text('logo_light_url'),
  station_tagline: text('station_tagline'),
  voice_style: text('voice_style'), // Neutral, Energetic, Smooth
  pronunciation_notes: text('pronunciation_notes'),

  // Contacts
  primary_contact_name: text('primary_contact_name').notNull(),
  primary_contact_email: text('primary_contact_email').notNull(),
  primary_contact_role: text('primary_contact_role'), // Program Director, Station Manager, Producer
  billing_contact_name: text('billing_contact_name'),
  billing_contact_email: text('billing_contact_email'),

  // Licensing & Compliance
  license_confirmed: integer('license_confirmed', { mode: 'boolean' }).default(false),
  station_website: text('station_website'),

  // Tracking
  created_at: text('created_at').default(new Date().toISOString()),
  updated_at: text('updated_at').default(new Date().toISOString()),

  // Section-specific update tracking
  identity_updated_at: text('identity_updated_at'),
  preferences_updated_at: text('preferences_updated_at'),
  branding_updated_at: text('branding_updated_at'),
  contacts_updated_at: text('contacts_updated_at'),
  licensing_updated_at: text('licensing_updated_at'),
});

// Relations
export const stationSettingsRelations = relations(stationSettings, ({ one }) => ({
  user: one(users, {
    fields: [stationSettings.user_id],
    references: [users.user_id],
  }),
}));


