import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import {
  organization,
  organizationMember,
  station,
  user,
} from '@/lib/db/schema';
import { StationBootstrapSchema, slugify } from '@/lib/integration/contracts';
import { ensureStudioEntitlement } from '@/lib/integration/licensing';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = StationBootstrapSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'invalid_input', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select({ organization, station })
    .from(organizationMember)
    .innerJoin(
      organization,
      eq(organization.id, organizationMember.organizationId)
    )
    .leftJoin(station, eq(station.organizationId, organization.id))
    .where(eq(organizationMember.userId, session.user.id))
    .limit(1);

  if (existing?.station) {
    const entitlement = await ensureStudioEntitlement(existing.organization.id);
    return Response.json({
      organization: existing.organization,
      station: existing.station,
      entitlement,
      created: false,
    });
  }

  const [account] = await db
    .select({
      radioName: user.radioName,
      name: user.name,
      timezone: user.timezone,
      locale: user.locale,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  const fallbackName = account?.radioName || account?.name || 'My station';
  const organizationName = parsed.data.organizationName || fallbackName;
  const stationName = parsed.data.stationName || fallbackName;
  const timezone = parsed.data.timezone || account?.timezone || 'UTC';
  const defaultLanguage = parsed.data.defaultLanguage || account?.locale || 'en';

  let org = existing?.organization ?? null;
  if (!org) {
    const uniqueSuffix = randomBytes(3).toString('hex');
    [org] = await db
      .insert(organization)
      .values({
        name: organizationName,
        slug: `${slugify(organizationName)}-${uniqueSuffix}`,
        billingUserId: session.user.id,
      })
      .returning();

    await db.insert(organizationMember).values({
      organizationId: org.id,
      userId: session.user.id,
      role: 'owner',
    });
  }

  const [createdStation] = await db
    .insert(station)
    .values({
      organizationId: org.id,
      name: stationName,
      slug: slugify(stationName),
      timezone,
      defaultLanguage,
      defaultVoiceId: parsed.data.defaultVoiceId,
    })
    .returning();

  const entitlement = await ensureStudioEntitlement(org.id);

  return Response.json(
    { organization: org, station: createdStation, entitlement, created: true },
    { status: 201 }
  );
}
