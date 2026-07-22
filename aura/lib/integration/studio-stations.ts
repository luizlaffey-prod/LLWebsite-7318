import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  organization,
  organizationMember,
  station,
  user,
} from '@/lib/db/schema';
import { ensureStudioEntitlement } from '@/lib/integration/licensing';
import { slugify } from '@/lib/integration/contracts';

export interface ManageableStation {
  organizationId: string;
  organizationName: string;
  stationId: string;
  stationName: string;
  role: string;
}

/** Stations the user can manage (owner/admin) across all their organizations. */
export async function getManageableStations(
  userId: string
): Promise<ManageableStation[]> {
  return db
    .select({
      organizationId: organization.id,
      organizationName: organization.name,
      stationId: station.id,
      stationName: station.name,
      role: organizationMember.role,
    })
    .from(organizationMember)
    .innerJoin(organization, eq(organization.id, organizationMember.organizationId))
    .innerJoin(station, eq(station.organizationId, organization.id))
    .where(
      and(
        eq(organizationMember.userId, userId),
        inArray(organizationMember.role, ['owner', 'admin'])
      )
    );
}

/**
 * Like getManageableStations, but bootstraps a default organization + station
 * (+ trial entitlement) for a brand-new account that has none yet — so a user
 * who just created their account in the sign-in flow still has a station to
 * connect. An existing AURA account is never given a duplicate: if the user
 * already manages any station, those are returned untouched.
 */
export async function getOrCreateManageableStations(
  userId: string
): Promise<ManageableStation[]> {
  const existing = await getManageableStations(userId);
  if (existing.length > 0) return existing;

  const [account] = await db
    .select({
      radioName: user.radioName,
      name: user.name,
      timezone: user.timezone,
      locale: user.locale,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const fallback = account?.radioName || account?.name || 'My station';

  // Idempotent bootstrap. neon-http has no interactive transactions, so each
  // step is made concurrency-safe by an existing unique constraint: a
  // deterministic per-user org slug + ON CONFLICT means two concurrent loads
  // converge on the SAME organization (never a duplicate org or trial), the
  // membership is unique per (org, user), and the trial entitlement is unique
  // per org via ensureStudioEntitlement's ON CONFLICT.
  const orgSlug = `studio-${slugify(userId)}`.slice(0, 64);
  await db
    .insert(organization)
    .values({ name: fallback, slug: orgSlug, billingUserId: userId })
    .onConflictDoNothing({ target: organization.slug });
  const [org] = await db
    .select({ id: organization.id, name: organization.name })
    .from(organization)
    .where(eq(organization.slug, orgSlug))
    .limit(1);
  if (!org) throw new Error('studio_bootstrap_failed');

  await db
    .insert(organizationMember)
    .values({ organizationId: org.id, userId, role: 'owner' })
    .onConflictDoNothing({
      target: [organizationMember.organizationId, organizationMember.userId],
    });

  await ensureStudioEntitlement(org.id);

  // Create the default station only if the org has none yet. (The org is now
  // shared across concurrent loads, so this check-then-insert is a very narrow
  // window — a rooted follow-up is a unique index on station(organization_id)
  // for the default station; not added here to avoid touching existing prod
  // station rows.)
  const [existingStation] = await db
    .select({ id: station.id })
    .from(station)
    .where(eq(station.organizationId, org.id))
    .limit(1);
  if (!existingStation) {
    await db.insert(station).values({
      organizationId: org.id,
      name: fallback,
      slug: slugify(fallback),
      timezone: account?.timezone ?? 'UTC',
      defaultLanguage: account?.locale ?? 'en',
    });
  }

  return getManageableStations(userId);
}
