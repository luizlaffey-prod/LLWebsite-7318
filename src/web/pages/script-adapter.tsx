import { useEffect, useRef, useState } from "react";
import { Layout } from "../components/shared";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Clapperboard,
  Upload,
  FileText,
  X,
  Film,
  Tv,
  Layers,
  Sparkles,
  Copy,
  Check,
  Download,
  Loader2,
  AlertCircle,
  Lock,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useSubscription } from "../hooks/useSubscription";
import {
  parseDocument,
  SUPPORTED_EXTENSIONS,
  UnsupportedFileError,
  EmptyDocumentError,
  type ParsedDocument,
} from "../lib/documentParser";
import {
  parseScreenplay,
  slugify,
  exportMarkdown,
  exportFdx,
  exportPdf,
  exportDocx,
} from "../lib/screenplay";

type Format = "film" | "series" | "both";

interface FormatOption {
  id: Format;
  icon: typeof Film;
}

const formatOptions: FormatOption[] = [
  { id: "film", icon: Film },
  { id: "series", icon: Tv },
  { id: "both", icon: Layers },
];

const ACCEPT = SUPPORTED_EXTENSIONS.map((ext) => `.${ext}`).join(",");

function ScriptAdapterTool() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [doc, setDoc] = useState<ParsedDocument | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [format, setFormat] = useState<Format>("film");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("");
  const [parsing, setParsing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleFile = async (file: File) => {
    setError(null);
    setParsing(true);
    setDoc(null);
    try {
      const parsed = await parseDocument(file);
      setDoc(parsed);
    } catch (err) {
      if (err instanceof UnsupportedFileError) {
        setError(t("scriptAdapter.errors.unsupported"));
      } else if (err instanceof EmptyDocumentError) {
        setError(t("scriptAdapter.errors.empty"));
      } else {
        setError(t("scriptAdapter.errors.parse"));
      }
    } finally {
      setParsing(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const sourceText = mode === "upload" ? doc?.text ?? "" : pastedText.trim();

  const handleGenerate = async () => {
    if (!sourceText) {
      setError(t("scriptAdapter.errors.noInput"));
      return;
    }
    setError(null);
    setOutput("");
    setGenerating(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/screenwriter/adapt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user ? { Authorization: `Bearer ${user.user_id}` } : {}),
        },
        body: JSON.stringify({
          text: sourceText,
          format,
          length,
          title: title.trim() || undefined,
          language: language.trim() || undefined,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error("Request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(t("scriptAdapter.errors.generic"));
      }
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => abortRef.current?.abort();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (kind: "md" | "pdf" | "docx" | "fdx") => {
    setExportOpen(false);
    setError(null);
    const base = slugify(title || "roteiro");
    try {
      if (kind === "md") {
        exportMarkdown(output, base);
        return;
      }
      const elements = parseScreenplay(output);
      if (kind === "pdf") await exportPdf(elements, base);
      if (kind === "docx") await exportDocx(elements, base);
      if (kind === "fdx") exportFdx(elements, base);
    } catch {
      setError(t("scriptAdapter.errors.export"));
    }
  };

  const canGenerate = !!sourceText && !generating && !parsing;

  const exportItems: { kind: "md" | "pdf" | "docx" | "fdx"; label: string }[] = [
    { kind: "pdf", label: t("scriptAdapter.output.formats.pdf") },
    { kind: "docx", label: t("scriptAdapter.output.formats.docx") },
    { kind: "fdx", label: t("scriptAdapter.output.formats.fdx") },
    { kind: "md", label: t("scriptAdapter.output.formats.markdown") },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0d1117] to-[#0a0a0a]" />
        <div className="absolute top-1/3 -left-48 w-96 h-96 bg-[#d4a843]/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 -right-48 w-96 h-96 bg-[#0047ab]/5 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-[#d4a843]/10 flex items-center justify-center">
              <Clapperboard className="text-[#d4a843]" size={26} />
            </div>
            <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium">
              {t("scriptAdapter.overline")}
            </span>
          </div>
          <h1 className="font-heading text-4xl md:text-6xl text-white mb-6 leading-[1.1]">
            {t("scriptAdapter.title")}{" "}
            <span className="text-[#d4a843]">{t("scriptAdapter.titleHighlight")}</span>
          </h1>
          <p className="font-body text-lg text-white/70 leading-relaxed max-w-3xl">
            {t("scriptAdapter.subtitle")}
          </p>
        </div>
      </section>

      {/* Tool */}
      <section className="relative pb-24">
        <div className="max-w-5xl mx-auto px-6 space-y-8">
          {/* Step 1: Source */}
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <h2 className="font-heading text-xl text-white flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-[#d4a843] text-[#0a0a0a] text-sm font-bold flex items-center justify-center">
                  1
                </span>
                {t("scriptAdapter.source.title")}
              </h2>
              <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setMode("upload")}
                  className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded transition-colors ${
                    mode === "upload" ? "bg-[#d4a843] text-[#0a0a0a]" : "text-white/60 hover:text-white"
                  }`}
                >
                  {t("scriptAdapter.source.fileTab")}
                </button>
                <button
                  onClick={() => setMode("paste")}
                  className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded transition-colors ${
                    mode === "paste" ? "bg-[#d4a843] text-[#0a0a0a]" : "text-white/60 hover:text-white"
                  }`}
                >
                  {t("scriptAdapter.source.pasteTab")}
                </button>
              </div>
            </div>

            {mode === "upload" ? (
              <div>
                {doc ? (
                  <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="text-[#d4a843] shrink-0" size={22} />
                      <div className="min-w-0">
                        <p className="text-white text-sm truncate">{doc.name}</p>
                        <p className="text-white/50 text-xs">
                          {t("scriptAdapter.source.parsed", { count: doc.text.length })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDoc(null)}
                      className="text-white/50 hover:text-white shrink-0 ml-3"
                      aria-label={t("scriptAdapter.source.remove")}
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    className={`w-full border-2 border-dashed rounded-xl py-12 px-6 flex flex-col items-center justify-center text-center transition-colors ${
                      dragging ? "border-[#d4a843] bg-[#d4a843]/5" : "border-white/15 hover:border-[#d4a843]/50"
                    }`}
                  >
                    {parsing ? (
                      <>
                        <Loader2 className="text-[#d4a843] animate-spin mb-3" size={32} />
                        <p className="text-white/70 text-sm">{t("scriptAdapter.source.parsing")}</p>
                      </>
                    ) : (
                      <>
                        <Upload className="text-[#d4a843] mb-3" size={32} />
                        <p className="text-white font-medium mb-1">{t("scriptAdapter.source.dropLabel")}</p>
                        <p className="text-white/50 text-sm">{t("scriptAdapter.source.dropHint")}</p>
                      </>
                    )}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  onChange={onInputChange}
                  className="hidden"
                />
              </div>
            ) : (
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={t("scriptAdapter.source.pastePlaceholder")}
                rows={10}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-white/90 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#d4a843]/50 resize-y"
              />
            )}
          </div>

          {/* Step 2: Format */}
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 md:p-8">
            <h2 className="font-heading text-xl text-white flex items-center gap-3 mb-5">
              <span className="w-7 h-7 rounded-full bg-[#d4a843] text-[#0a0a0a] text-sm font-bold flex items-center justify-center">
                2
              </span>
              {t("scriptAdapter.format.title")}
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {formatOptions.map((option) => {
                const Icon = option.icon;
                const active = format === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setFormat(option.id)}
                    className={`text-left rounded-xl border p-5 transition-all ${
                      active
                        ? "border-[#d4a843] bg-[#d4a843]/10"
                        : "border-white/10 bg-white/5 hover:border-white/25"
                    }`}
                  >
                    <Icon className={active ? "text-[#d4a843]" : "text-white/70"} size={26} />
                    <p className="text-white font-medium mt-3">
                      {t(`scriptAdapter.format.${option.id}`)}
                    </p>
                    <p className="text-white/50 text-xs mt-1 leading-relaxed">
                      {t(`scriptAdapter.format.${option.id}Desc`)}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Length (token economy) */}
            <div className="mt-6">
              <label className="block text-white/60 text-xs uppercase tracking-wider mb-2">
                {t("scriptAdapter.length.label")}
              </label>
              <div className="grid sm:grid-cols-3 gap-3">
                {(["short", "medium", "long"] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setLength(value)}
                    className={`text-left rounded-lg border px-4 py-3 transition-all ${
                      length === value
                        ? "border-[#d4a843] bg-[#d4a843]/10"
                        : "border-white/10 bg-white/5 hover:border-white/25"
                    }`}
                  >
                    <p className="text-white text-sm font-medium">{t(`scriptAdapter.length.${value}`)}</p>
                    <p className="text-white/50 text-xs mt-0.5">{t(`scriptAdapter.length.${value}Desc`)}</p>
                  </button>
                ))}
              </div>
              <p className="text-white/40 text-xs mt-2">{t("scriptAdapter.length.hint")}</p>
            </div>

            {/* Optional refinements */}
            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              <div>
                <label className="block text-white/60 text-xs uppercase tracking-wider mb-2">
                  {t("scriptAdapter.options.titleLabel")}
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("scriptAdapter.options.titlePlaceholder")}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white/90 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#d4a843]/50"
                />
              </div>
              <div>
                <label className="block text-white/60 text-xs uppercase tracking-wider mb-2">
                  {t("scriptAdapter.options.languageLabel")}
                </label>
                <input
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder={t("scriptAdapter.options.languagePlaceholder")}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white/90 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#d4a843]/50"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Generate */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#d4a843] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#e8c574] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {generating
                ? t("scriptAdapter.generating")
                : output
                  ? t("scriptAdapter.regenerate")
                  : t("scriptAdapter.generate")}
            </button>
            {generating && (
              <button
                onClick={handleStop}
                className="inline-flex items-center gap-2 px-6 py-4 border border-white/20 text-white font-medium text-sm uppercase tracking-wider rounded transition-all hover:border-red-400 hover:text-red-300"
              >
                {t("scriptAdapter.stop")}
              </button>
            )}
          </div>

          {/* Output */}
          {(output || generating) && (
            <div className="bg-[#111111] border border-white/10 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h2 className="font-heading text-lg text-white flex items-center gap-2">
                  <Clapperboard className="text-[#d4a843]" size={20} />
                  {t("scriptAdapter.output.title")}
                </h2>
                {output && (
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/70 hover:text-[#d4a843] transition-colors"
                    >
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                      {copied ? t("scriptAdapter.output.copied") : t("scriptAdapter.output.copy")}
                    </button>
                    <div className="relative" ref={exportRef}>
                      <button
                        onClick={() => setExportOpen((open) => !open)}
                        disabled={generating}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/70 hover:text-[#d4a843] transition-colors disabled:opacity-40"
                      >
                        <Download size={15} />
                        {t("scriptAdapter.output.export")}
                        <ChevronDown size={13} className={exportOpen ? "rotate-180 transition-transform" : "transition-transform"} />
                      </button>
                      {exportOpen && (
                        <div className="absolute right-0 top-full mt-2 z-20 w-48 bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden shadow-xl">
                          {exportItems.map((item) => (
                            <button
                              key={item.kind}
                              onClick={() => handleExport(item.kind)}
                              className="block w-full px-4 py-2.5 text-left text-sm text-white/80 hover:bg-[#d4a843] hover:text-[#0a0a0a] transition-colors"
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <pre className="whitespace-pre-wrap font-mono text-sm text-white/85 leading-relaxed">
                  {output}
                  {generating && <span className="inline-block w-2 h-4 bg-[#d4a843] animate-pulse ml-0.5 align-middle" />}
                </pre>
              </div>
            </div>
          )}

          <p className="text-white/40 text-xs text-center">{t("scriptAdapter.disclaimer")}</p>
        </div>
      </section>
    </>
  );
}

function LockScreen({ authenticated }: { authenticated: boolean }) {
  const { t } = useTranslation();

  return (
    <section className="relative py-28 overflow-hidden min-h-[70vh] flex items-center">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0d1117] to-[#0a0a0a]" />
      <div className="absolute top-1/3 -left-48 w-96 h-96 bg-[#d4a843]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-[#0047ab]/5 rounded-full blur-3xl" />

      <div className="relative max-w-xl mx-auto px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#d4a843]/10 flex items-center justify-center mx-auto mb-6">
          <Lock className="text-[#d4a843]" size={30} />
        </div>
        <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
          {t("scriptAdapter.gate.badge")}
        </span>
        <h1 className="font-heading text-3xl md:text-4xl text-white mb-4">
          {authenticated ? t("scriptAdapter.gate.lockedTitle") : t("scriptAdapter.gate.guestTitle")}
        </h1>
        <p className="font-body text-white/70 leading-relaxed mb-8">
          {authenticated ? t("scriptAdapter.gate.lockedSubtitle") : t("scriptAdapter.gate.guestSubtitle")}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/plans"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#d4a843] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#e8c574]"
          >
            {t("scriptAdapter.gate.plansCta")}
          </Link>
          {!authenticated && (
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/20 text-white font-medium text-sm uppercase tracking-wider rounded transition-all duration-300 hover:border-[#d4a843] hover:text-[#d4a843]"
            >
              {t("scriptAdapter.gate.loginCta")}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function ScriptAdapter() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { originals, loading: subLoading } = useSubscription();

  const loading = authLoading || subLoading;
  const isSubscriber = !!user && originals.length > 0;

  return (
    <Layout>
      {loading ? (
        <section className="min-h-[70vh] flex items-center justify-center">
          <div className="flex items-center gap-3 text-white/60">
            <Loader2 className="animate-spin text-[#d4a843]" size={22} />
            {t("scriptAdapter.gate.checking")}
          </div>
        </section>
      ) : isSubscriber ? (
        <ScriptAdapterTool />
      ) : (
        <LockScreen authenticated={!!user} />
      )}
    </Layout>
  );
}

export default ScriptAdapter;
