export interface ParsedDocument {
  text: string;
  /** Detected source kind, useful for UI feedback. */
  kind: "pdf" | "word" | "spreadsheet" | "text" | "unknown";
  /** Original file name. */
  name: string;
}

export class UnsupportedFileError extends Error {}
export class EmptyDocumentError extends Error {}

const getExtension = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

const parsePdf = async (file: File): Promise<string> => {
  const pdfjsLib = await import("pdfjs-dist");
  const { default: pdfWorkerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(pageText);
  }

  return pages.join("\n\n");
};

const parseWord = async (file: File): Promise<string> => {
  // mammoth's browser build extracts raw text without Node dependencies.
  const mammoth = await import("mammoth/mammoth.browser");
  const buffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
  return value;
};

const parseSpreadsheet = async (file: File): Promise<string> => {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    return `# ${sheetName}\n${csv}`;
  }).join("\n\n");
};

const parseText = async (file: File): Promise<string> => file.text();

const PARSERS: Record<
  string,
  { kind: ParsedDocument["kind"]; parse: (file: File) => Promise<string> }
> = {
  pdf: { kind: "pdf", parse: parsePdf },
  doc: { kind: "word", parse: parseWord },
  docx: { kind: "word", parse: parseWord },
  xls: { kind: "spreadsheet", parse: parseSpreadsheet },
  xlsx: { kind: "spreadsheet", parse: parseSpreadsheet },
  csv: { kind: "spreadsheet", parse: parseSpreadsheet },
  txt: { kind: "text", parse: parseText },
  md: { kind: "text", parse: parseText },
  rtf: { kind: "text", parse: parseText },
};

export const SUPPORTED_EXTENSIONS = Object.keys(PARSERS);

export const parseDocument = async (file: File): Promise<ParsedDocument> => {
  const extension = getExtension(file.name);
  const parser = PARSERS[extension];

  if (!parser) {
    throw new UnsupportedFileError(extension);
  }

  const raw = await parser.parse(file);
  // Normalize non-breaking spaces and collapse runs of blank lines.
  const text = raw
    .replace(/ /g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) {
    throw new EmptyDocumentError(file.name);
  }

  return { text, kind: parser.kind, name: file.name };
};
