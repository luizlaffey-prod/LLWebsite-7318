// Converts the AI-generated Markdown screenplay into structured elements and
// exports them to industry formats (Final Draft .fdx, PDF, Word .docx).
// Heavy libraries (jspdf, docx) are imported on demand so they never weigh on
// the initial bundle.

export type ElementType =
  | "title"
  | "section"
  | "scene_heading"
  | "action"
  | "character"
  | "parenthetical"
  | "dialogue"
  | "transition"
  | "note";

export interface ScreenplayElement {
  type: ElementType;
  text: string;
}

const SCENE_RE = /^(INT\.?\/EXT\.?|EXT\.?\/INT\.?|INT\.?|EXT\.?|EST\.?|I\/E\.?)[\s.]/i;
const TRANSITION_RE =
  /^(FADE IN:|FADE OUT\.?:?|FADE TO:|CUT TO:|SMASH CUT TO:?|MATCH CUT TO:?|DISSOLVE TO:|JUMP CUT TO:|TIME CUT:|HARD CUT TO:|INTERCUT.*|BACK TO:)$/i;
const ENDS_TO_RE = /\bTO:$/;
const PAREN_RE = /^\(.*\)$/;
const NOTE_RE = /^\[?\s*director'?s notes?\s*\]?:?/i;
const SECTION_RE =
  /^(CHARACTER BREAKDOWN|CHARACTERS?|CAST|LOGLINE|TITLE|SERIES OVERVIEW|OVERVIEW|SEASON \d|EPISODE \d|EPISODE MAP|PART [A-Z0-9]|ACT [IVX\d]|PILOT|SYNOPSIS|FEATURE FILM|TELEVISION SERIES|THEMES?|TONE)\b/i;

const stripMd = (s: string) =>
  s
    .replace(/\*\*/g, "")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1$2")
    .replace(/`/g, "")
    .replace(/^>\s?/, "")
    .trim();

const isUpper = (s: string) => {
  const letters = s.replace(/[^A-Za-zÀ-ÿ]/g, "");
  return letters.length > 0 && s === s.toUpperCase();
};

const findNextNonEmpty = (lines: string[], from: number): string | null => {
  for (let i = from; i < lines.length; i++) {
    const value = stripMd(lines[i]);
    if (value) return value;
  }
  return null;
};

export const parseScreenplay = (raw: string): ScreenplayElement[] => {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const out: ScreenplayElement[] = [];
  let titleDone = false;
  let prev: ElementType | null = null;

  for (let i = 0; i < lines.length; i++) {
    const original = lines[i];
    const line = stripMd(original);

    if (!line) {
      prev = null;
      continue;
    }

    // Markdown headings.
    const heading = original.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const text = stripMd(heading[2]);
      if (!titleDone && heading[1].length <= 2) {
        out.push({ type: "title", text });
        titleDone = true;
      } else {
        out.push({ type: "section", text });
      }
      prev = "section";
      continue;
    }

    // Horizontal rules / separators.
    if (/^[-*_]{3,}$/.test(line)) {
      prev = null;
      continue;
    }

    // Director's notes.
    if (NOTE_RE.test(line)) {
      out.push({ type: "note", text: line.replace(/^\[|\]$/g, "") });
      prev = "note";
      continue;
    }

    // Scene headings.
    if (SCENE_RE.test(line)) {
      out.push({ type: "scene_heading", text: line.toUpperCase() });
      prev = "scene_heading";
      continue;
    }

    // Known section labels (avoid misreading them as character cues).
    if (isUpper(line) && SECTION_RE.test(line)) {
      out.push({ type: "section", text });
      prev = "section";
      continue;
    }

    // Transitions.
    if (TRANSITION_RE.test(line) || (isUpper(line) && ENDS_TO_RE.test(line) && line.length <= 30)) {
      out.push({ type: "transition", text: line.toUpperCase() });
      prev = "transition";
      continue;
    }

    // Parentheticals only make sense around dialogue.
    if (PAREN_RE.test(line) && (prev === "character" || prev === "dialogue")) {
      out.push({ type: "parenthetical", text: line });
      prev = "parenthetical";
      continue;
    }

    // Bullet list items (character breakdown, director's note details).
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      const text = stripMd(bullet[1]);
      const type: ElementType = prev === "note" ? "note" : "action";
      out.push({ type, text });
      prev = type;
      continue;
    }

    // Character cue: short, uppercase, followed by dialogue (not a bullet list).
    const next = findNextNonEmpty(lines, i + 1);
    const core = line.replace(/\((CONT'D|O\.S\.|V\.O\.|OFF|OS|VO)\)\s*$/i, "").trim();
    const looksLikeCharacter =
      isUpper(line) &&
      core.length > 0 &&
      core.length <= 40 &&
      core.split(/\s+/).length <= 5 &&
      !/[.!?,:;]$/.test(core) &&
      next !== null &&
      !/^[-*•]\s+/.test(next) &&
      !SCENE_RE.test(next);
    if (looksLikeCharacter) {
      out.push({ type: "character", text: line.toUpperCase() });
      prev = "character";
      continue;
    }

    // Dialogue follows a character cue / parenthetical.
    if (prev === "character" || prev === "parenthetical" || prev === "dialogue") {
      out.push({ type: "dialogue", text: line });
      prev = "dialogue";
      continue;
    }

    out.push({ type: "action", text: line });
    prev = "action";
  }

  return out;
};

export const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "roteiro";

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------------------
// Markdown (.md)
// ---------------------------------------------------------------------------
export const exportMarkdown = (markdown: string, baseName: string) => {
  triggerDownload(new Blob([markdown], { type: "text/markdown" }), `${baseName}.md`);
};

// ---------------------------------------------------------------------------
// Final Draft (.fdx)
// ---------------------------------------------------------------------------
const FDX_TYPE: Record<ElementType, string> = {
  title: "General",
  section: "General",
  scene_heading: "Scene Heading",
  action: "Action",
  character: "Character",
  parenthetical: "Parenthetical",
  dialogue: "Dialogue",
  transition: "Transition",
  note: "General",
};

const xmlEscape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const exportFdx = (elements: ScreenplayElement[], baseName: string) => {
  const paragraphs = elements
    .map(
      (el) =>
        `    <Paragraph Type="${FDX_TYPE[el.type]}"><Text>${xmlEscape(el.text)}</Text></Paragraph>`
    )
    .join("\n");

  const fdx = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
  <Content>
${paragraphs}
  </Content>
</FinalDraft>
`;

  triggerDownload(new Blob([fdx], { type: "application/xml" }), `${baseName}.fdx`);
};

// ---------------------------------------------------------------------------
// PDF (.pdf) — Courier, standard screenplay margins.
// ---------------------------------------------------------------------------
interface PdfLayout {
  x: number;
  width: number;
  align?: "left" | "center" | "right";
  style: "normal" | "bold" | "italic";
  size?: number;
  spaceBefore?: number;
}

export const exportPdf = async (elements: ScreenplayElement[], baseName: string) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "in", format: "letter" });

  const pageW = 8.5;
  const pageH = 11;
  const left = 1.5;
  const right = 1;
  const top = 1;
  const bottom = 1;
  const lineH = 1 / 6; // 12pt single line
  const bodyWidth = pageW - left - right;

  const layouts: Record<ElementType, PdfLayout> = {
    title: { x: pageW / 2, width: bodyWidth, align: "center", style: "bold", size: 18, spaceBefore: 0.5 },
    section: { x: pageW / 2, width: bodyWidth, align: "center", style: "bold", size: 13, spaceBefore: lineH * 1.5 },
    scene_heading: { x: left, width: bodyWidth, style: "bold", spaceBefore: lineH },
    action: { x: left, width: bodyWidth, style: "normal" },
    character: { x: left + 2.2, width: 3, style: "normal", spaceBefore: lineH },
    parenthetical: { x: left + 1.6, width: 2, style: "normal" },
    dialogue: { x: left + 1, width: 3.3, style: "normal" },
    transition: { x: pageW - right, width: bodyWidth, align: "right", style: "normal", spaceBefore: lineH },
    note: { x: left, width: bodyWidth, style: "italic", size: 10 },
  };

  let y = top;

  const ensureSpace = () => {
    if (y > pageH - bottom) {
      doc.addPage();
      y = top;
    }
  };

  for (const el of elements) {
    const layout = layouts[el.type];
    const size = layout.size ?? 12;
    doc.setFont("courier", layout.style);
    doc.setFontSize(size);

    if (layout.spaceBefore) {
      y += layout.spaceBefore;
    }

    const text = el.type === "note" ? `» ${el.text}` : el.text;
    const wrapped = doc.splitTextToSize(text, layout.width) as string[];
    const wrappedLineH = (size / 12) * lineH;

    for (const wline of wrapped) {
      ensureSpace();
      doc.text(wline, layout.x, y, layout.align ? { align: layout.align } : undefined);
      y += wrappedLineH;
    }
  }

  triggerDownload(doc.output("blob"), `${baseName}.pdf`);
};

// ---------------------------------------------------------------------------
// Word (.docx)
// ---------------------------------------------------------------------------
export const exportDocx = async (elements: ScreenplayElement[], baseName: string) => {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, convertInchesToTwip } = await import("docx");

  const inch = (value: number) => convertInchesToTwip(value);

  const buildParagraph = (el: ScreenplayElement) => {
    const base = {
      title: { alignment: AlignmentType.CENTER, bold: true, size: 32, before: 240, after: 240 },
      section: { alignment: AlignmentType.CENTER, bold: true, size: 26, before: 240, after: 120 },
      scene_heading: { bold: true, before: 240, after: 60 },
      action: { after: 120 },
      character: { indent: { left: inch(2.2) }, before: 120 },
      parenthetical: { indent: { left: inch(1.6) } },
      dialogue: { indent: { left: inch(1), right: inch(1.5) }, after: 120 },
      transition: { alignment: AlignmentType.RIGHT, before: 120, after: 120 },
      note: { italics: true, size: 20, after: 120 },
    }[el.type];

    const text = el.type === "note" ? `» ${el.text}` : el.text;

    return new Paragraph({
      alignment: "alignment" in base ? base.alignment : undefined,
      spacing: {
        before: "before" in base ? base.before : undefined,
        after: "after" in base ? base.after : undefined,
      },
      indent: "indent" in base ? base.indent : undefined,
      children: [
        new TextRun({
          text,
          font: "Courier New",
          bold: "bold" in base ? base.bold : undefined,
          italics: "italics" in base ? base.italics : undefined,
          size: "size" in base ? base.size : 24,
        }),
      ],
    });
  };

  const document = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: inch(1), bottom: inch(1), left: inch(1.5), right: inch(1) },
          },
        },
        children: elements.map(buildParagraph),
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  triggerDownload(blob, `${baseName}.docx`);
};
