/**
 * Seed data for initial database setup
 * Per instruction: originals + plans must be created
 */

import { database } from './index';
import { originals, plans } from './schema';

/**
 * Initialize database with seed data per instruction spec
 */
export async function seedDatabase() {
  try {
    console.log('🌱 Seeding database...');

    // Insert originals
    // Instruction spec: slug + name
    console.log('📺 Creating originals...');
    await database.insert(originals).values([
      {
        slug: 'luiz-laffey-collection',
        name: "Luiz Laffey's Collection",
        is_active: true,
      },
      {
        slug: 'zero-point-zero',
        name: 'Zero Point Zero',
        is_active: true,
      },
    ]);

    // Insert plans
    // Instruction spec: slug, name, allows_multiple (boolean), price_cents (int)
    console.log('💰 Creating plans...');
    await database.insert(plans).values([
      {
        slug: 'monthly',
        name: 'Monthly Broadcast',
        allows_multiple: false, // Single original only
        price_cents: 2900, // $29.00
        billing_cycle: 'monthly',
        description: 'One-month access to one program',
        is_active: true,
      },
      {
        slug: 'annual',
        name: 'Annual Broadcast',
        allows_multiple: false, // Single original only
        price_cents: 29900, // $299.00
        billing_cycle: 'annual',
        description: 'One-year access to one program',
        is_active: true,
      },
      {
        slug: 'dual-annual',
        name: 'Dual Program Annual',
        allows_multiple: true, // Allows multiple originals = AUTO-LINK ALL
        price_cents: 41800, // $418.00
        billing_cycle: 'annual',
        description: 'One-year access to both programs (30% discount)',
        is_active: true,
      },
    ]);

    console.log('✅ Database seeded successfully!');
    return true;
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    return false;
  }
}
