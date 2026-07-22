import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/auth/server';
import { ensureStudioEntitlement } from '@/lib/integration/licensing';
import { getOrCreateManageableStations } from '@/lib/integration/studio-stations';
import { StudioAuthorizeParamsSchema } from '@/lib/integration/contracts';
import { deviceKeyFingerprint } from '@/lib/integration/license-crypto';
import {
  canonicalizeRedirectUri,
  isValidCodeChallenge,
  isValidLoopbackRedirectUri,
  STUDIO_PRO_CLIENT_ID,
} from '@/lib/integration/studio-auth-policy';
import { ConsentClient } from './consent-client';
import type { Locale } from '@/i18n';

export const dynamic = 'force-dynamic';

function ErrorView({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4 text-center">
      <div className="max-w-md">
        <h1 className="font-serif text-2xl font-semibold text-text-primary">
          {message}
        </h1>
        <p className="mt-3 text-sm text-text-secondary">
          Close this window and try again from Studio Pro.
        </p>
      </div>
    </div>
  );
}

export default async function StudioConnectPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations('studioConnectPage');

  const parsed = StudioAuthorizeParamsSchema.safeParse(sp);
  // Canonicalize first (platform may substitute 127.0.0.1 → localhost or leave
  // the value encoded on this request too); validate + use the numeric form.
  const redirectUri = parsed.success
    ? canonicalizeRedirectUri(parsed.data.redirect_uri)
    : '';
  if (
    !parsed.success ||
    parsed.data.client_id !== STUDIO_PRO_CLIENT_ID ||
    !isValidLoopbackRedirectUri(redirectUri) ||
    !isValidCodeChallenge(parsed.data.code_challenge)
  ) {
    return <ErrorView message={t('invalidRequest')} />;
  }
  const p = { ...parsed.data, redirect_uri: redirectUri };
  try {
    deviceKeyFingerprint(p.device_public_key);
  } catch {
    return <ErrorView message={t('invalidRequest')} />;
  }

  const session = await getSession();
  if (!session?.user) {
    // Return the operator here after they log in or create an account.
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (v) qs.set(k, String(v));
    const callbackURL = `/${locale}/studio-connect?${qs.toString()}`;
    redirect(`/${locale}/login?callbackURL=${encodeURIComponent(callbackURL)}`);
  }

  const stations = await getOrCreateManageableStations(session.user.id);

  // Resolve each org's entitlement once for the package summary.
  const entByOrg = new Map<
    string,
    Awaited<ReturnType<typeof ensureStudioEntitlement>>
  >();
  for (const s of stations) {
    if (!entByOrg.has(s.organizationId)) {
      entByOrg.set(s.organizationId, await ensureStudioEntitlement(s.organizationId));
    }
  }

  const stationOptions = stations.map((s) => {
    const e = entByOrg.get(s.organizationId)!;
    return {
      stationId: s.stationId,
      stationName: s.stationName,
      organizationName: s.organizationName,
      entitlement: {
        status: e.status,
        planCode: e.planCode,
        features: e.features,
        maxDevicesPerStation: e.maxDevicesPerStation,
        maxConcurrentOutputs: e.maxConcurrentOutputs,
        validUntil: e.validUntil ? e.validUntil.toISOString() : null,
      },
    };
  });

  return (
    <ConsentClient
      locale={locale}
      accountEmail={session.user.email ?? ''}
      params={{
        client_id: p.client_id,
        redirect_uri: p.redirect_uri,
        state: p.state,
        code_challenge: p.code_challenge,
        code_challenge_method: p.code_challenge_method,
        device_name: p.device_name,
        device_platform: p.device_platform,
        device_public_key: p.device_public_key,
        device_key_algorithm: p.device_key_algorithm,
        ...(p.scope ? { scope: p.scope } : {}),
      }}
      stations={stationOptions}
    />
  );
}
