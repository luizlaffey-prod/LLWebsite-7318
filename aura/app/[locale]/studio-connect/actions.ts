'use server';

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/server';
import { normalizeRequestedScopes } from '@/lib/integration/contracts';
import {
  IntegrationHttpError,
  requireStationMember,
} from '@/lib/integration/authorization';
import { requireUsableStudioEntitlement } from '@/lib/integration/licensing';
import { deviceKeyFingerprint } from '@/lib/integration/license-crypto';
import {
  isValidCodeChallenge,
  isValidLoopbackRedirectUri,
  STUDIO_PRO_CLIENT_ID,
} from '@/lib/integration/studio-auth-policy';
import { issueStudioAuthGrant } from '@/lib/integration/studio-auth';

export interface AuthorizeState {
  error?: string;
}

/**
 * Finalizes the "Sign in with AURA" consent: validates the session, the OAuth
 * params and the selected station, checks the entitlement, mints a single-use
 * authorization code bound to the device public key, and redirects the browser
 * to the desktop's loopback callback with `code` and `state`. No web session
 * or password ever reaches the desktop — only the code travels back.
 */
export async function authorizeStudioConnect(
  _prev: AuthorizeState,
  formData: FormData
): Promise<AuthorizeState> {
  const session = await getSession();
  if (!session?.user) return { error: 'unauthorized' };

  const get = (k: string) => (formData.get(k) ?? '').toString();
  const clientId = get('client_id');
  const redirectUri = get('redirect_uri');
  const state = get('state');
  const codeChallenge = get('code_challenge');
  const codeChallengeMethod = get('code_challenge_method');
  const deviceName = get('device_name');
  const devicePlatform = get('device_platform');
  const devicePublicKey = get('device_public_key');
  const deviceKeyAlgorithm = get('device_key_algorithm');
  const stationId = get('station_id');
  const scopeRaw = get('scope');

  // Re-validate everything server-side; never trust the hidden fields.
  if (clientId !== STUDIO_PRO_CLIENT_ID) return { error: 'invalid_client' };
  if (!isValidLoopbackRedirectUri(redirectUri)) return { error: 'invalid_redirect_uri' };
  if (codeChallengeMethod !== 'S256' || !isValidCodeChallenge(codeChallenge)) {
    return { error: 'invalid_request' };
  }
  if (!state || state.length < 8) return { error: 'invalid_request' };
  if (
    !deviceName ||
    (devicePlatform !== 'windows' && devicePlatform !== 'macos') ||
    deviceKeyAlgorithm !== 'ES256' ||
    !stationId
  ) {
    return { error: 'invalid_request' };
  }

  let fingerprint: string;
  try {
    fingerprint = deviceKeyFingerprint(devicePublicKey);
  } catch {
    return { error: 'invalid_device_key' };
  }

  // Bind the requested scope subset to the grant (never widen it). An
  // unsupported scope is rejected rather than escalated to the defaults.
  const scopes = normalizeRequestedScopes(scopeRaw || undefined);
  if (scopes === null) return { error: 'invalid_scope' };

  let redirectTarget: string;
  try {
    // The user must own/admin the chosen station, and the entitlement must be
    // usable, before we register a computer under it.
    const member = await requireStationMember(stationId, session.user.id, [
      'owner',
      'admin',
    ]);
    await requireUsableStudioEntitlement(member.organization.id);

    const { code } = await issueStudioAuthGrant({
      clientId,
      redirectUri,
      pkceChallenge: codeChallenge,
      pkceMethod: 'S256',
      userId: session.user.id,
      organizationId: member.organization.id,
      stationId,
      deviceName,
      devicePlatform,
      devicePublicKey,
      deviceKeyAlgorithm,
      deviceFingerprint: fingerprint,
      scopes,
    });

    const dest = new URL(redirectUri);
    dest.searchParams.set('code', code);
    dest.searchParams.set('state', state);
    redirectTarget = dest.toString();
  } catch (error) {
    if (error instanceof IntegrationHttpError) {
      if (error.code === 'studio_license_inactive') {
        return { error: 'entitlement_inactive' };
      }
      if (error.code === 'station_not_found') return { error: 'forbidden' };
      return { error: error.code };
    }
    return { error: 'unknown' };
  }

  // Must run outside the try so Next's redirect control-flow isn't swallowed.
  redirect(redirectTarget);
}
