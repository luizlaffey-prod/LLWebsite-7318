import type { Emotion } from '@/lib/audio/emotions';

export interface ScriptBlock {
  text: string;
  emotion: Emotion;
  duracaoSegundos: number;
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
