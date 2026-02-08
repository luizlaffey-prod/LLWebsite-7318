import { sqliteTable, text, real, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
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
