import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Reports which LLM-related env vars the deployed runtime can actually see.
 * Returns booleans only — never the keys themselves. Authenticated to keep
 * the surface small.
 */
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? '';
  const geminiKey = process.env.GEMINI_API_KEY ?? '';

  return NextResponse.json({
    hasAnthropicKey: anthropicKey.length > 0,
    anthropicKeyPrefix: anthropicKey.slice(0, 7) || null,
    hasGeminiKey: geminiKey.length > 0,
    geminiKeyPrefix: geminiKey.slice(0, 4) || null,
    llmProvider: process.env.LLM_PROVIDER ?? null,
    claudeModel: process.env.AURA_CLAUDE_MODEL ?? 'claude-sonnet-4-5-20250929 (default)',
    geminiModel: process.env.AURA_GEMINI_MODEL ?? 'gemini-2.5-pro (default)',
    vercelEnv: process.env.VERCEL_ENV ?? null,
  });
}
