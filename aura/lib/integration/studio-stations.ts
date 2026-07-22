import 'server-only';
import { randomBytes } from 'node:crypto';
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
  const suffix = randomBytes(3).toString('hex');

  const [org] = await db
    .insert(organization)
    .values({
      name: fallback,
      slug: `${slugify(fallback)}-${suffix}`,
      billingUserId: userId,
    })
    .returning();
  await db.insert(organizationMember).values({
    organizationId: org.id,
    userId,
    role: 'owner',
  });
  const [st] = await db
    .insert(station)
    .values({
      organizationId: org.id,
      name: fallback,
      slug: slugify(fallback),
      timezone: account?.timezone ?? 'UTC',
      defaultLanguage: account?.locale ?? 'en',
    })
    .returning();
  await ensureStudioEntitlement(org.id);

  return [
    {
      organizationId: org.id,
      organizationName: org.name,
      stationId: st.id,
      stationName: st.name,
      role: 'owner',
    },
  ];
}
