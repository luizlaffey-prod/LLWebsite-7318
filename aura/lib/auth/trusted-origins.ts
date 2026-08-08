const HTTPS_PROTOCOL = 'https://';

function normalizeOrigin(value: string | undefined): string | undefined {
  const candidate = value?.trim();

  if (!candidate) {
    return undefined;
  }

  try {
    const url = new URL(
      candidate.includes('://') ? candidate : `${HTTPS_PROTOCOL}${candidate}`,
    );

    return url.origin;
  } catch {
    return undefined;
  }
}

/**
 * Build the Better Auth allowlist from explicit application URLs and the
 * deployment URLs injected by Vercel. VERCEL_BRANCH_URL is important here:
 * users open the stable Git branch alias while VERCEL_URL identifies a single
 * deployment. Both must be trusted for Preview authentication to work.
 */
export function getTrustedOrigins(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string[] {
  const candidates = [
    env.BETTER_AUTH_URL,
    env.NEXT_PUBLIC_APP_URL,
    env.VERCEL_URL,
    env.VERCEL_BRANCH_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL,
  ];

  return Array.from(
    new Set(
      candidates
        .map(normalizeOrigin)
        .filter((origin): origin is string => origin !== undefined),
    ),
  );
}
