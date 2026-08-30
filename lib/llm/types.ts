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
  /**
   * Today's date, formatted in the station's timezone. Injected
   * verbatim into the LLM prompt so the script doesn't hallucinate a
   * date from the model's training cutoff (real bug: bulletin said
   * "today, first of July" when it was June 2). Pass both an ISO
   * form and a human-readable one so the model can cite either.
   */
  today?: {
    iso: string;
    readable: string;
  };
  weather?: {
    location: string;
    summary: string;
    format: 'separate' | 'integrated';
  };
}

export interface LlmProvider {
  /** Identifier used in env vars + logs. */
  id: 'openai' | 'claude' | 'gemini';
  /** Issues a single completion request and returns the raw JSON-ish text. */
  complete(input: {
    systemPrompt: string;
    userPrompt: string;
    maxTokens?: number;
    temperature?: number;
    /**
     * Optional domain validation. The fallback coordinator runs it before
     * accepting a provider result, so malformed or incomplete output can move
     * to the next configured provider instead of escaping the safety chain.
     */
    validate?: (result: string) => void;
  }): Promise<string>;
}
