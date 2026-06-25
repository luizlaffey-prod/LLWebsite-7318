import { Hono } from "hono";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "cloudflare:workers";
import dedent from "dedent";

const app = new Hono().basePath("/api/screenwriter");

const openai = createOpenAI({
  baseURL: env.AI_GATEWAY_BASE_URL,
  apiKey: env.AI_GATEWAY_API_KEY,
});

type Format = "film" | "series" | "both";

const FORMAT_GUIDANCE: Record<Format, string> = {
  film: dedent`
    TARGET FORMAT: FEATURE FILM.
    Structure the adaptation as a single feature-length screenplay following the
    classic three-act structure (setup, confrontation, resolution). Aim for a
    self-contained cinematic arc with a clear inciting incident, midpoint,
    climax, and resolution. Think in terms of theatrical pacing.`,
  series: dedent`
    TARGET FORMAT: TELEVISION SERIES.
    Adapt the material into a series. First provide a SERIES OVERVIEW (logline,
    tone, target seasons) and a SEASON 1 EPISODE MAP (episode titles + one-line
    synopses). Then write the full PILOT EPISODE screenplay in detail, ending on
    a hook that pulls the audience into episode 2. Think in terms of serialized
    arcs, act breaks for commercial/streaming beats, and ensemble character
    development.`,
  both: dedent`
    TARGET FORMAT: BOTH FILM AND SERIES.
    Produce TWO clearly separated deliverables:
    PART A — FEATURE FILM adaptation (three-act structure, self-contained arc).
    PART B — TELEVISION SERIES adaptation (series overview + season 1 episode map
    + full pilot screenplay).
    Note in a short paragraph which format best serves this story and why.`,
};

const buildSystemPrompt = (format: Format, language: string, length: Length) => dedent`
  You are an award-winning film and television DIRECTOR and professional
  SCREENWRITER. You receive raw source material — a story, novel excerpt, report,
  notes, or any prose — and you adapt it into a complete, production-ready
  screenplay, thinking and writing exactly as a director would on set.

  ${FORMAT_GUIDANCE[format]}

  ${LENGTH_GUIDANCE[length]}

  WRITE THE OUTPUT IN THIS LANGUAGE: ${language}.

  Follow professional screenplay craft and industry formatting conventions:

  1. TITLE & LOGLINE — Open with a title and a one-sentence logline.
  2. CHARACTER BREAKDOWN — List the principal characters with a short description
     (age range, essence, motivation).
  3. SCENE HEADINGS (sluglines) — Every scene starts with INT./EXT. LOCATION — TIME
     (e.g. "INT. ABANDONED WAREHOUSE — NIGHT").
  4. ACTION / SCENE DESCRIPTION — Present tense, vivid but economical.
  5. DIRECTOR'S NOTES per scene — As the director, specify:
       • LOCATION: where it is shot and why this setting serves the story.
       • CAMERA: shot sizes, angles, and movement (e.g. slow dolly-in, handheld
         close-up, crane shot, over-the-shoulder).
       • LIGHTING: mood, key/fill, color temperature, practical sources.
       • SOUND / SCORE: ambience, musical cues, silence.
       • BLOCKING / PERFORMANCE: how actors move and the emotional beat to play.
     Mark these clearly (e.g. with a "[DIRECTOR'S NOTES]" label) so they are easy
     to distinguish from the screenplay body.
  6. DIALOGUE — Character name centered/uppercase above their lines, with
     parentheticals for delivery where it matters.
  7. TRANSITIONS — Use CUT TO:, DISSOLVE TO:, SMASH CUT:, etc. where appropriate.

  Preserve the spirit, themes, and key characters of the source material, but
  exercise creative directorial judgment to make it cinematic: invent visual
  detail, condense or expand beats, and dramatize exposition into scenes.
  Be thorough and concrete — this should read like a real shooting script.
  Output well-structured Markdown. Do not ask clarifying questions; commit to
  strong creative choices.
`;

type Length = "short" | "medium" | "long";

// Output-token budget per length. Capping this is the main lever for both cost
// (you only pay for tokens generated) and for staying within model deadlines.
const LENGTH_TOKENS: Record<Length, number> = {
  short: 3000,
  medium: 4500,
  long: 6000,
};

const LENGTH_GUIDANCE: Record<Length, string> = {
  short:
    "LENGTH: CONCISE. Deliver a tight, treatment-style screenplay covering only the key scenes and turning points. Be economical — no filler, no repetition, no padding.",
  medium: "LENGTH: STANDARD. Cover the main story beats as full scenes. Be efficient and avoid padding.",
  long: "LENGTH: DETAILED. Develop the scenes fully, but never pad — every line must earn its place.",
};

interface AdaptRequest {
  text?: string;
  format?: Format;
  title?: string;
  language?: string;
  length?: Length;
}

app.post("/adapt", async (c) => {
  // The tool is restricted to subscribers; the frontend gates access via the
  // site's auth/subscription state and forwards the user token. Require its
  // presence here as a minimal backend guard against anonymous direct calls.
  const authorization = c.req.header("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return c.json({ error: "Subscribers only. Please sign in." }, 401);
  }

  const body = await c.req.json<AdaptRequest>();
  const sourceText = body.text?.trim();
  const format: Format = body.format ?? "film";
  const length: Length = body.length && body.length in LENGTH_TOKENS ? body.length : "medium";
  const language = body.language?.trim() || "the same language as the source document";

  if (!sourceText) {
    return c.json({ error: "Missing source text to adapt." }, 400);
  }

  if (!["film", "series", "both"].includes(format)) {
    return c.json({ error: "Invalid format. Use 'film', 'series' or 'both'." }, 400);
  }

  // Guard against pathologically large inputs that would blow the context window.
  const MAX_CHARS = 200_000;
  const truncated = sourceText.length > MAX_CHARS;
  const material = truncated ? sourceText.slice(0, MAX_CHARS) : sourceText;

  const titleLine = body.title?.trim()
    ? `The user suggests this working title: "${body.title.trim()}".\n\n`
    : "";

  const userPrompt = dedent`
    ${titleLine}Here is the source material to adapt into a screenplay${
      truncated ? " (note: it was truncated to fit; adapt what is provided)" : ""
    }:

    --- SOURCE MATERIAL START ---
    ${material}
    --- SOURCE MATERIAL END ---
  `;

  const result = streamText({
    model: openai.chat("anthropic/claude-opus-4.5"),
    system: buildSystemPrompt(format, language, length),
    prompt: userPrompt,
    maxOutputTokens: LENGTH_TOKENS[length],
  });

  return result.toTextStreamResponse();
});

export default app;
