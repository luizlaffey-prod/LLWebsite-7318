import type { Emotion } from '@/lib/audio/emotions';

export interface ScriptBlock {
  text: string;
  emotion: Emotion;
  duracaoSegundos: number;
  /**
   * Topic the block belongs to (e.g. 'politics', 'sports', 'weather').
   * Used by the audio pipeline to insert transition stings between
   * topic changes — when undefined or matching the previous block's
   * category, no sting is inserted.
   */
  category?: string;
}

export interface ScriptGenerationInput {
  newsContent: string;
  targetDurationSeconds: number;
  language: 'en' | 'pt' | 'es';
  weather?: {
    location: string;
    summary: string;
    format: 'separate' | 'integrated';
  };
}

export interface LlmProvider {
  /** Identifier used in env vars + logs (e.g. "claude", "gemini"). */
  id: 'claude' | 'gemini';
  /** Issues a single completion request and returns the raw JSON-ish text. */
  complete(input: {
    systemPrompt: string;
    userPrompt: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<string>;
}
