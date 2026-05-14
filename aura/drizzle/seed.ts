/**
 * Idempotent seed for the voice catalog. Run with:
 *   bun run db:seed
 *
 * Safe to run multiple times — uses ON CONFLICT (slug) DO UPDATE.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { voice } from '@/lib/db/schema';
import { VOICE_CATALOG } from '@/lib/tts/voice-catalog';

async function main() {
  console.log(`Seeding ${VOICE_CATALOG.length} voices...`);

  for (const seed of VOICE_CATALOG) {
    await db
      .insert(voice)
      .values({
        slug: seed.slug,
        elevenLabsVoiceId: seed.elevenLabsVoiceId,
        name: seed.name,
        description: seed.description,
        languages: seed.languages,
        gender: seed.gender,
        style: seed.style,
        accent: seed.accent,
        tierRequired: seed.tierRequired,
        enabled: true,
      })
      .onConflictDoUpdate({
        target: voice.slug,
        set: {
          elevenLabsVoiceId: sql`excluded.eleven_labs_voice_id`,
          name: sql`excluded.name`,
          description: sql`excluded.description`,
          languages: sql`excluded.languages`,
          gender: sql`excluded.gender`,
          style: sql`excluded.style`,
          accent: sql`excluded.accent`,
          tierRequired: sql`excluded.tier_required`,
        },
      });
    console.log(`  · ${seed.slug} (${seed.tierRequired})`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error('Seed failed', err);
  process.exit(1);
});
