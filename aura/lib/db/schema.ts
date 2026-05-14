import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  uuid,
  uniqueIndex,
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

// --- Better Auth core tables (id is text, matches Better Auth defaults) ---
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  name: text('name'),
  image: text('image'),
  // AURA-specific fields:
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

// --- AURA business tables ---
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

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Subscription = typeof subscription.$inferSelect;
export type UsagePeriod = typeof usagePeriod.$inferSelect;

// Re-export placeholders for tables introduced in later phases so other modules can
// import from a single barrel file. Definitions live in this file as phases land.
