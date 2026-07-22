import { StudioAuthorizeParamsSchema } from '@/lib/integration/contracts';
import { deviceKeyFingerprint } from '@/lib/integration/license-crypto';
import {
  isValidCodeChallenge,
  isValidLoopbackRedirectUri,
  STUDIO_PRO_CLIENT_ID,
} from '@/lib/integration/studio-auth-policy';
import {
  enforceRateLimit,
  rateLimitClientKey,
} from '@/lib/integration/rate-limit-store';
import { integrationErrorResponse } from '@/lib/integration/authorization';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONSENT_LOCALES = ['en', 'pt', 'es'] as const;

/**
 * OAuth authorize entry point the desktop opens in the system browser. It
 * validates the public-client parameters and, on success, forwards to the
 * localized consent page which handles login/signup, station selection and
 * consent. On any parameter error it renders a plain error page and **never
 * redirects** — closing open-redirect vectors (an invalid client_id or
 * redirect_uri must not bounce the browser anywhere).
 */
export async function GET(req: Request) {
  try {
    await enforceRateLimit({
      key: rateLimitClientKey(req, 'studio-auth-authorize'),
      limit: 60,
      windowMs: 60_000,
    });

    const url = new URL(req.url);
    const parsed = StudioAuthorizeParamsSchema.safeParse(
      Object.fromEntries(url.searchParams)
    );
    if (!parsed.success) {
      return errorPage('invalid_request', 'The sign-in request is malformed.');
    }
    const p = parsed.data;

    // client_id and redirect_uri are validated FIRST and, if bad, we never
    // redirect — only show an error (RFC 6749 §4.1.2.1).
    if (p.client_id !== STUDIO_PRO_CLIENT_ID) {
      return errorPage('invalid_client', 'Unknown client.');
    }
    if (!isValidLoopbackRedirectUri(p.redirect_uri)) {
      return errorPage(
        'invalid_redirect_uri',
        'The redirect URI is not an allowed loopback callback.'
      );
    }
    if (!isValidCodeChallenge(p.code_challenge)) {
      return errorPage('invalid_request', 'Invalid PKCE code_challenge.');
    }
    // The device public key must be a parseable P-256 SPKI key.
    try {
      deviceKeyFingerprint(p.device_public_key);
    } catch {
      return errorPage('invalid_request', 'Invalid device public key.');
    }

    // Forward the validated params to the consent page.
    const locale =
      (CONSENT_LOCALES as readonly string[]).includes(
        url.searchParams.get('ui_locales') ?? ''
      )
        ? (url.searchParams.get('ui_locales') as string)
        : 'en';

    const forward = new URLSearchParams({
      client_id: p.client_id,
      redirect_uri: p.redirect_uri,
      state: p.state,
      code_challenge: p.code_challenge,
      code_challenge_method: p.code_challenge_method,
      device_name: p.device_name,
      device_platform: p.device_platform,
      device_public_key: p.device_public_key,
      device_key_algorithm: p.device_key_algorithm,
    });
    if (p.scope) forward.set('scope', p.scope);

    const dest = new URL(`/${locale}/studio-connect`, url.origin);
    dest.search = forward.toString();
    return Response.redirect(dest.toString(), 302);
  } catch (error) {
    return integrationErrorResponse(error);
  }
}

function errorPage(code: string, message: string): Response {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign in with AURA</title>
<style>body{font-family:system-ui,sans-serif;background:#06080F;color:#e8eaf0;
display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
.card{max-width:28rem;padding:2rem;text-align:center}
code{color:#00E5C8}</style></head>
<body><div class="card"><h1>Couldn't start sign-in</h1>
<p>${esc(message)}</p><p><code>${esc(code)}</code></p>
<p>Close this window and try again from Studio Pro.</p></div></body></html>`;
  return new Response(html, {
    status: 400,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
