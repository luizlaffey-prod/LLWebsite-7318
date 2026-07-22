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
import { studioBootstrapOrgSlug } from '@/lib/integration/studio-bootstrap';

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
  // step is made concurrency-safe by an existing unique constraint.
  //
  // The organization identity is a COLLISION-RESISTANT hash of the user id
  // (not a human/name-derived slug), so two different users can never map to
  // the same tenant. ON CONFLICT means concurrent loads converge on the SAME
  // organization. We then VERIFY ownership: if the slug somehow already
  // belongs to another billing user, we refuse rather than attach this user
  // as an owner of someone else's organization.
  const orgSlug = studioBootstrapOrgSlug(userId);
  await db
    .insert(organization)
    .values({ name: fallback, slug: orgSlug, billingUserId: userId })
    .onConflictDoNothing({ target: organization.slug });
  const [org] = await db
    .select({
      id: organization.id,
      name: organization.name,
      billingUserId: organization.billingUserId,
    })
    .from(organization)
    .where(eq(organization.slug, orgSlug))
    .limit(1);
  if (!org) throw new Error('studio_bootstrap_failed');
  if (org.billingUserId !== userId) {
    // Cross-tenant safety net — never grant membership/entitlement on an org
    // owned by a different account.
    throw new Error('studio_bootstrap_org_conflict');
  }

  await db
    .insert(organizationMember)
    .values({ organizationId: org.id, userId, role: 'owner' })
    .onConflictDoNothing({
      target: [organizationMember.organizationId, organizationMember.userId],
    });

  await ensureStudioEntitlement(org.id);

  // Default station: deterministic slug + ON CONFLICT on the existing unique
  // (organization_id, slug) index makes this fully idempotent — both
  // concurrent requests converge on one station, no SELECT→INSERT race.
  const stationSlug = slugify(fallback);
  await db
    .insert(station)
    .values({
      organizationId: org.id,
      name: fallback,
      slug: stationSlug,
      timezone: account?.timezone ?? 'UTC',
      defaultLanguage: account?.locale ?? 'en',
    })
    .onConflictDoNothing({ target: [station.organizationId, station.slug] });

  return getManageableStations(userId);
}
