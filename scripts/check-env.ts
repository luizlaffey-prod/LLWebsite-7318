/**
 * Prints a checklist of required and optional env vars with their current
 * status. Useful right before `bun run build` to catch missing config early.
 *
 *   bun run env:check
 */

interface VarSpec {
  name: string;
  required: boolean;
  group: string;
  note?: string;
}

const VARS: VarSpec[] = [
  { name: 'DATABASE_URL', required: true, group: 'Core' },
  { name: 'BETTER_AUTH_SECRET', required: true, group: 'Core', note: '≥32 chars' },
  { name: 'BETTER_AUTH_URL', required: true, group: 'Core' },
  { name: 'NEXT_PUBLIC_APP_URL', required: true, group: 'Core' },

  { name: 'ANTHROPIC_API_KEY', required: false, group: 'LLM (one of two)' },
  { name: 'GEMINI_API_KEY', required: false, group: 'LLM (one of two)' },
  {
    name: 'LLM_PROVIDER',
    required: false,
    group: 'LLM (one of two)',
    note: 'optional override: "claude" or "gemini"',
  },
  { name: 'ELEVENLABS_API_KEY', required: false, group: 'TTS' },
  { name: 'FISHAUDIO_API_KEY', required: false, group: 'TTS' },

  { name: 'NEWSAPI_KEY', required: false, group: 'News (at least one)' },
  { name: 'GNEWS_KEY', required: false, group: 'News (at least one)' },

  { name: 'OPENWEATHER_API_KEY', required: false, group: 'Weather + geo' },

  { name: 'STRIPE_SECRET_KEY', required: false, group: 'Payments' },
  { name: 'STRIPE_WEBHOOK_SECRET', required: false, group: 'Payments' },
  { name: 'STRIPE_PRICE_STARTER', required: false, group: 'Payments' },
  { name: 'STRIPE_PRICE_STANDARD', required: false, group: 'Payments' },
  { name: 'STRIPE_PRICE_PRO', required: false, group: 'Payments' },
  { name: 'STRIPE_PRICE_STUDIO_PRO', required: false, group: 'Payments' },
  { name: 'STRIPE_PRICE_STUDIO_ENTERPRISE', required: false, group: 'Payments' },

  { name: 'RESEND_API_KEY', required: false, group: 'Email' },
  { name: 'RESEND_FROM_EMAIL', required: false, group: 'Email' },

  { name: 'R2_ACCOUNT_ID', required: false, group: 'Audio storage' },
  { name: 'R2_ACCESS_KEY_ID', required: false, group: 'Audio storage' },
  { name: 'R2_SECRET_ACCESS_KEY', required: false, group: 'Audio storage' },
  { name: 'R2_BUCKET', required: false, group: 'Audio storage' },
  { name: 'R2_PUBLIC_BASE_URL', required: false, group: 'Audio storage', note: 'optional CDN URL' },

  { name: 'CRON_SECRET', required: false, group: 'Cron jobs' },
  {
    name: 'DEVICE_TOKEN_PEPPER',
    required: false,
    group: 'Studio Pro integration',
    note: 'recommended dedicated ≥32-char secret; falls back to SECRETS_KEY/BETTER_AUTH_SECRET',
  },
  {
    name: 'STUDIO_LICENSE_PRIVATE_KEY',
    required: false,
    group: 'Studio Pro integration',
    note: 'Ed25519 PKCS#8 PEM/base64; required to issue desktop license leases',
  },
  {
    name: 'STUDIO_LICENSE_KEY_ID',
    required: false,
    group: 'Studio Pro integration',
    note: 'public key rotation identifier; defaults to studio-2026-01',
  },
];

const COL = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function check(v: VarSpec): { mark: string; color: string; note?: string } {
  const value = process.env[v.name];
  if (!value) {
    return v.required
      ? { mark: '✗', color: COL.red, note: 'REQUIRED — missing' }
      : { mark: '○', color: COL.yellow, note: 'not set (feature disabled)' };
  }
  if (v.name === 'BETTER_AUTH_SECRET' && value.length < 32) {
    return { mark: '✗', color: COL.red, note: 'too short (needs ≥32 chars)' };
  }
  return { mark: '✓', color: COL.green, note: v.note };
}

const groups = VARS.reduce<Record<string, VarSpec[]>>((acc, v) => {
  (acc[v.group] ??= []).push(v);
  return acc;
}, {});

console.log(`${COL.bold}AURA — environment checklist${COL.reset}\n`);

let missingRequired = 0;
for (const [group, vars] of Object.entries(groups)) {
  console.log(`${COL.bold}${group}${COL.reset}`);
  for (const v of vars) {
    const s = check(v);
    if (v.required && s.mark === '✗') missingRequired++;
    const noteStr = s.note ? `  ${COL.dim}${s.note}${COL.reset}` : '';
    console.log(`  ${s.color}${s.mark}${COL.reset} ${v.name}${noteStr}`);
  }
  console.log();
}

if (missingRequired > 0) {
  console.log(`${COL.red}${COL.bold}✗ ${missingRequired} required variable(s) missing${COL.reset}`);
  console.log(`  See .env.example for descriptions and how to obtain them.`);
  process.exit(1);
} else {
  console.log(`${COL.green}${COL.bold}✓ all required variables set${COL.reset}`);
  console.log(`  Optional integrations: open /settings/health after boot to test each.`);
}
