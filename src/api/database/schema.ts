import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Users table - identity and account info only
export const users = sqliteTable('users', {
  user_id: text('user_id').primaryKey(),
  email: text('email').unique().notNull(),
  name: text('name'),
  created_at: text('created_at').default(new Date().toISOString()),
  status: text('status').default('active'),
});

// Programs table - what can be subscribed to
export const programs = sqliteTable('programs', {
  program_id: text('program_id').primaryKey(),
  program_name: text('program_name').notNull(),
  description: text('description'),
  is_active: integer('is_active', { mode: 'boolean' }).default(true),
});

// Plans table - billing options (Monthly, Annual, Strategic Partnership)
export const plans = sqliteTable('plans', {
  plan_id: text('plan_id').primaryKey(),
  plan_name: text('plan_name').notNull(),
  billing_cycle: text('billing_cycle'), // 'monthly', 'annual'
  price: real('price'),
  description: text('description'),
  is_active: integer('is_active', { mode: 'boolean' }).default(true),
});

// Subscriptions table - CORE ACCESS CONTROL
// One subscription = one program access
// Multiple programs require multiple subscriptions
export const subscriptions = sqliteTable('subscriptions', {
  subscription_id: text('subscription_id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.user_id),
  program_id: text('program_id').notNull().references(() => programs.program_id),
  plan_id: text('plan_id').notNull().references(() => plans.plan_id),
  status: text('status').default('active'), // 'active', 'canceled', 'expired', 'pending'
  start_date: text('start_date').default(new Date().toISOString()),
  end_date: text('end_date'), // NULL means no expiration
  auto_renew: integer('auto_renew', { mode: 'boolean' }).default(true),
  payment_id: text('payment_id'), // PayPal transaction ID
  created_at: text('created_at').default(new Date().toISOString()),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.user_id],
    references: [users.user_id],
  }),
  program: one(programs, {
    fields: [subscriptions.program_id],
    references: [programs.program_id],
  }),
  plan: one(plans, {
    fields: [subscriptions.plan_id],
    references: [plans.plan_id],
  }),
}));

export const programsRelations = relations(programs, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));
