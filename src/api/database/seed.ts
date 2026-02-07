import { database } from './index';
import { users, programs, plans, subscriptions } from './schema';

/**
 * Initialize database with seed data
 * Run this once to set up programs and plans
 */
export async function initializeDatabase() {
  try {
    // Insert programs
    await database.insert(programs).values([
      {
        program_id: 'ZERO_POINT_ZERO',
        program_name: 'Zero Point Zero',
        description: 'Electronic and techno broadcast series',
        is_active: true,
      },
      {
        program_id: 'LUIZ_LAFFEY_COLLECTION',
        program_name: "Luiz Laffey's Collection",
        description: 'Music discovery and curation series',
        is_active: true,
      },
    ]).onConflictDoNothing();

    // Insert plans
    await database.insert(plans).values([
      {
        plan_id: 'MONTHLY_BROADCAST',
        plan_name: 'Monthly Broadcast License',
        billing_cycle: 'monthly',
        price: 9.99,
        description: 'Access for one month',
        is_active: true,
      },
      {
        plan_id: 'ANNUAL_BROADCAST',
        plan_name: 'Annual Broadcast License',
        billing_cycle: 'annual',
        price: 99.99,
        description: 'Access for one year',
        is_active: true,
      },
      {
        plan_id: 'STRATEGIC_ANNUAL',
        plan_name: 'Strategic Annual Partnership',
        billing_cycle: 'annual',
        price: 199.99,
        description: 'Access to both programs for one year',
        is_active: true,
      },
    ]).onConflictDoNothing();

    console.log('✅ Database initialized with programs and plans');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}
